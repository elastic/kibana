export function actionsMenuContent(toastNotifications: any, share: any, mlApi: any, showEditJobFlyout: any, showDatafeedChartFlyout: any, showDeleteJobModal: any, showResetJobModal: any, showStartDatafeedModal: any, showCloseJobsConfirmModal: any, showStopDatafeedsConfirmModal: any, refreshJobs: any, showCreateAlertFlyout: any): ({
    name: string;
    description: string;
    icon: string;
    enabled: (item: any) => boolean;
    available: (item: any) => any;
    onClick: (item: any) => void;
    'data-test-subj': string;
    color?: undefined;
} | {
    name: string;
    description: string;
    icon: string;
    enabled: (item: any) => boolean;
    onClick: (item: any) => void;
    'data-test-subj': string;
    available?: undefined;
    color?: undefined;
} | {
    name: string;
    description: string;
    icon: string;
    color: string;
    enabled: () => boolean;
    onClick: (item: any) => void;
    'data-test-subj': string;
    available?: undefined;
})[];
