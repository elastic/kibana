import React from 'react';
export declare enum FlyoutType {
    JOB_DETAILS = "jobDetails",
    DATAFEED_CHART = "datafeedChart",
    DATA_FRAME_ANALYTICS_DETAILS = "dataFrameAnalyticsDetails"
}
interface JobInfoFlyoutsContextValue {
    activeJobId: string | null;
    setActiveJobId: (jobId: string | null) => void;
    activeFlyout: FlyoutType | null;
    setActiveFlyout: (flyout: FlyoutType | null) => void;
    isDetailFlyoutOpen: boolean;
    isDatafeedChartFlyoutOpen: boolean;
    closeActiveFlyout: () => void;
    isDataFrameAnalyticsDetailsFlyoutOpen: boolean;
}
export declare const JobInfoFlyoutsContext: React.Context<JobInfoFlyoutsContextValue>;
export declare const useJobInfoFlyouts: () => JobInfoFlyoutsContextValue;
export declare const JobInfoFlyoutsProvider: React.FC<{
    children: React.ReactNode;
}>;
export {};
