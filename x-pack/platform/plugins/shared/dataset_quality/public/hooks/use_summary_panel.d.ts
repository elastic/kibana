import type { QualityIndicators } from '../../common/types';
declare const SummaryPanelProvider: import("react").FC<{
    children?: import("react").ReactNode | undefined;
}>, useSummaryPanelContext: () => {
    datasetsQuality: Record<QualityIndicators, number>;
    isDatasetsQualityLoading: boolean;
    isUserAuthorizedForDataset: boolean;
    isEstimatedDataLoading: boolean;
    estimatedData: number;
    isDatasetsActivityLoading: boolean;
    datasetsActivity: {
        total: number;
        active: number;
    };
    numberOfDatasets: number;
    numberOfDocuments: number;
};
export { useSummaryPanelContext };
export default SummaryPanelProvider;
