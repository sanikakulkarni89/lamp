import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Modal } from 'react-native';
//import { Svg, Circle, G } from 'react-native-svg';
import { Svg, Circle, G, Path as SvgPath } from 'react-native-svg';

// Define a simple calendar icon component
const CalendarIcon = () => (
    <Svg height="24" width="24" viewBox="0 0 24 24">
        <G fill="none" stroke="#4263eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="14" r="9" />
            <SvgPath d="M12 10v4l2 2" />
            <SvgPath d="M12 2v4" />
            <SvgPath d="M4.93 4.93l2.83 2.83" />
            <SvgPath d="M2 12h4" />
        </G>
    </Svg>
);

// Define a checkmark icon for completed days
const CheckmarkIcon = () => (
    <Svg height="20" width="20" viewBox="0 0 24 24">
        <SvgPath
            fill="#20c997"
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
        />
    </Svg>
);

// Define LAMP method stages with their time allocations
interface TimerStage {
    id: string;
    label: string;
    fullName: string;
    duration: number; // in seconds
    description: string;
}

// Define all stages with proper identifiers to distinguish between different P's
const lampStages: TimerStage[] = [
    {
        id: 'L',
        label: 'L',
        fullName: 'List',
        duration: 40 * 60,
        description: 'Compile a list of possible employers'
    },
    {
        id: 'A',
        label: 'A',
        fullName: 'Alumni',
        duration: 10 * 60,
        description: 'Identify Alumni'
    },
    {
        id: 'M',
        label: 'M',
        fullName: 'Motivation',
        duration: 5 * 60,
        description: 'Assess Motivation'
    },
    {
        id: 'P1',
        label: 'P',
        fullName: 'Postings',
        duration: 15 * 60,
        description: 'Classify postings'
    },
    {
        id: 'P2',
        label: 'P',
        fullName: 'Prioritize',
        duration: 20 * 60,
        description: 'Sort and prioritize'
    },
    {
        id: 'O',
        label: 'O',
        fullName: 'Outreach',
        duration: 30 * 60,
        description: 'Outreach for the rest of the time'
    },
];

// Calendar day interface
interface CalendarDay {
    date: string; // YYYY-MM-DD format
    completed: boolean;
}

// For demo purposes, we'll generate some history
const generateDemoHistory = (): CalendarDay[] => {
    const today = new Date();
    const history: CalendarDay[] = [];

    // Generate 7 previous days
    for (let i = 7; i > 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        history.push({
            date: date.toISOString().split('T')[0],
            completed: Math.random() > 0.3, // Randomly mark some as completed
        });
    }

    // Add today
    history.push({
        date: today.toISOString().split('T')[0],
        completed: false,
    });

    return history;
};

const LAMPJobSearchTimer = () => {
    // Use id as the unique identifier instead of just the label
    const [activeStageId, setActiveStageId] = useState<string>('L');
    const [timeRemaining, setTimeRemaining] = useState(lampStages[0].duration);
    const [isRunning, setIsRunning] = useState(false);
    const [progress] = useState(new Animated.Value(0));
    const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
    const [currentDate] = useState(new Date().toLocaleDateString());
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [calendarHistory, setCalendarHistory] = useState<CalendarDay[]>(generateDemoHistory());
    const [showCalendar, setShowCalendar] = useState(false);
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    // Circle properties
    const radius = 45;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;

    // Get active stage details
    const activeStage = lampStages.find(stage => stage.id === activeStageId) || lampStages[0];

    // Update progress percentage
    useEffect(() => {
        const completedCount = completedStages.size;
        const totalCount = lampStages.length;
        setProgressPercentage((completedCount / totalCount) * 100);

        // If all stages are completed, mark today as completed
        if (completedCount === totalCount) {
            markTodayAsCompleted();
        }
    }, [completedStages]);

    // Mark today as completed in the calendar history
    const markTodayAsCompleted = () => {
        const today = new Date().toISOString().split('T')[0];
        setCalendarHistory(prev =>
            prev.map(day =>
                day.date === today ? { ...day, completed: true } : day
            )
        );
    };

    // Update timer when stage changes
    useEffect(() => {
        setTimeRemaining(activeStage.duration);
        setIsRunning(false);
        progress.setValue(0);
        if (progressAnimation.current) {
            progressAnimation.current.stop();
        }
    }, [activeStageId]);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isRunning && timeRemaining > 0) {
            // Animate progress ring
            progressAnimation.current = Animated.timing(progress, {
                toValue: 1,
                duration: timeRemaining * 1000,
                useNativeDriver: true,
            });
            progressAnimation.current.start();

            interval = setInterval(() => {
                setTimeRemaining(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(interval!);
                        setIsRunning(false);
                        // Mark current stage as completed
                        setCompletedStages(prev => new Set(prev).add(activeStageId));
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else if (!isRunning && interval) {
            clearInterval(interval);
            if (progressAnimation.current) {
                progressAnimation.current.stop();
            }
        }

        return () => {
            if (interval) clearInterval(interval);
            if (progressAnimation.current) {
                progressAnimation.current.stop();
            }
        };
    }, [isRunning, timeRemaining]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress for SVG circle
    const progressStrokeDashoffset = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
    });

    // Toggle timer running state
    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    // Mark current stage as completed and move to next stage
    const completeStage = () => {
        // Mark current stage as completed
        setCompletedStages(prev => new Set(prev).add(activeStageId));

        // Find next stage index
        const currentIndex = lampStages.findIndex(stage => stage.id === activeStageId);
        if (currentIndex < lampStages.length - 1) {
            setActiveStageId(lampStages[currentIndex + 1].id);
        }

        // Reset timer
        setIsRunning(false);
        progress.setValue(0);
    };

    // Reset the current timer
    const resetTimer = () => {
        setTimeRemaining(activeStage.duration);
        setIsRunning(false);
        progress.setValue(0);
        if (progressAnimation.current) {
            progressAnimation.current.stop();
        }
    };

    // Reset all progress for a new day
    const resetAll = () => {
        setActiveStageId('L');
        setTimeRemaining(lampStages[0].duration);
        setIsRunning(false);
        setCompletedStages(new Set());
        progress.setValue(0);
        if (progressAnimation.current) {
            progressAnimation.current.stop();
        }
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Toggle calendar modal
    const toggleCalendar = () => {
        setShowCalendar(!showCalendar);
    };

    // Animated circle component
    const AnimatedCircle = Animated.createAnimatedComponent(Circle);

    // For SVG paths
    const Path = (props: any) => (
        <Path
            stroke="#4263eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        />
    );

    return (
        <View style={styles.container}>
            {/* Header with calendar icon */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.calendarIconContainer}
                    onPress={toggleCalendar}
                >
                    <CalendarIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>LAMP</Text>
                <Text style={styles.dateText}>{currentDate}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${progressPercentage}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>{Math.round(progressPercentage)}% Complete</Text>
            </View>

            {/* Timer Circle */}
            <View style={styles.clockContainer}>
                <Svg height="280" width="280" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <Circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#e9ecef"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress Circle */}
                    <G rotation="-90" origin="50,50">
                        <AnimatedCircle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#4263eb"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={progressStrokeDashoffset}
                            strokeLinecap="round"
                        />
                    </G>
                </Svg>
                <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
                    <Text style={styles.stageFullName}>{activeStage.fullName}</Text>
                </View>
            </View>

            {/* Stage description */}
            <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{activeStage.description}</Text>
            </View>

            {/* LAMP Tabs - using circular buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView}>
                <View style={styles.tabsContainer}>
                    {lampStages.map((stage) => (
                        <TouchableOpacity
                            key={stage.id}
                            style={[
                                styles.tabCircle,
                                activeStageId === stage.id && styles.activeTabCircle,
                                completedStages.has(stage.id) && styles.completedTabCircle
                            ]}
                            onPress={() => setActiveStageId(stage.id)}
                        >
                            <Text style={[
                                styles.tabCircleText,
                                activeStageId === stage.id && styles.activeTabText,
                                completedStages.has(stage.id) && styles.completedTabText
                            ]}>
                                {stage.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={toggleTimer}
                >
                    <Text style={styles.buttonText}>
                        {isRunning ? 'Pause' : 'Continue'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={resetTimer}
                >
                    <Text style={styles.secondaryButtonText}>Reset</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
                <TouchableOpacity
                    style={[styles.button, styles.completeButton]}
                    onPress={completeStage}
                >
                    <Text style={styles.buttonText}>Complete & Next</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.resetAllButton]}
                    onPress={resetAll}
                >
                    <Text style={styles.secondaryButtonText}>New Day</Text>
                </TouchableOpacity>
            </View>

            {/* Calendar Modal */}
            <Modal
                visible={showCalendar}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCalendar(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.calendarContainer}>
                        <View style={styles.calendarHeader}>
                            <Text style={styles.calendarTitle}>Job Search Activity</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.calendarScrollView}>
                            {calendarHistory.map((day, index) => (
                                <View key={index} style={styles.calendarDay}>
                                    <Text style={styles.calendarDayText}>{formatDate(day.date)}</Text>
                                    <View style={styles.calendarDayStatus}>
                                        {day.completed ? (
                                            <View style={styles.calendarDayCompleted}>
                                                <CheckmarkIcon />
                                                <Text style={styles.calendarDayCompletedText}>Completed</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.calendarDayIncompleteText}>Incomplete</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    calendarIconContainer: {
        position: 'absolute',
        left: 0,
        padding: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
    },
    dateText: {
        fontSize: 16,
        color: '#6c757d',
        marginLeft: 10,
    },
    progressBarContainer: {
        width: '100%',
        marginBottom: 20,
    },
    progressBarBackground: {
        height: 10,
        backgroundColor: '#e9ecef',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4263eb',
        borderRadius: 5,
    },
    progressText: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 5,
        textAlign: 'right',
    },
    clockContainer: {
        position: 'relative',
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    timeDisplay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#333',
    },
    stageFullName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#4263eb',
        marginTop: 5,
    },
    descriptionContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        maxWidth: '80%',
    },
    descriptionText: {
        textAlign: 'center',
        color: '#495057',
    },
    tabsScrollView: {
        maxHeight: 60,
        marginBottom: 20,
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    tabCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e9ecef',
        marginHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeTabCircle: {
        backgroundColor: '#4263eb',
    },
    completedTabCircle: {
        backgroundColor: '#20c997',
    },
    tabCircleText: {
        fontWeight: '700',
        color: '#495057',
        fontSize: 16,
    },
    activeTabText: {
        color: 'white',
    },
    completedTabText: {
        color: 'white',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        marginHorizontal: 5,
        minWidth: 120,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#4263eb',
    },
    secondaryButton: {
        backgroundColor: '#e9ecef',
    },
    completeButton: {
        backgroundColor: '#20c997',
    },
    resetAllButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ced4da',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    secondaryButtonText: {
        color: '#495057',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarContainer: {
        width: '80%',
        maxHeight: '70%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
    },
    closeButton: {
        fontSize: 20,
        color: '#6c757d',
        fontWeight: '600',
    },
    calendarScrollView: {
        maxHeight: '80%',
    },
    calendarDay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    calendarDayText: {
        fontSize: 16,
        color: '#212529',
    },
    calendarDayStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarDayCompleted: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarDayCompletedText: {
        marginLeft: 5,
        color: '#20c997',
        fontWeight: '500',
    },
    calendarDayIncompleteText: {
        color: '#6c757d',
    },
});

export default LAMPJobSearchTimer;
