export declare const useOverviewSummaryPanel: () => {
    totalDocsCount: string;
    sizeInBytes: string;
    isUserAllowedToSeeSizeInBytes: boolean;
    totalServicesCount: number;
    totalHostsCount: string;
    isSummaryPanelLoading: boolean;
    totalDegradedDocsCount: string;
    totalFailedDocsCount: string;
    degradedPercentage: number;
    failedPercentage: number;
    degradedQuality: import("../../common").QualityIndicators;
    failedQuality: import("../../common").QualityIndicators;
    quality: import("../../common").QualityIndicators;
};
