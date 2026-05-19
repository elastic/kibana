import type { SingleCaseMetricsFeature } from '../../common/ui';
export interface UseCasesFeatures {
    isAlertsEnabled: boolean;
    isSyncAlertsEnabled: boolean;
    observablesAuthorized: boolean;
    connectorsAuthorized: boolean;
    caseAssignmentAuthorized: boolean;
    pushToServiceAuthorized: boolean;
    metricsFeatures: SingleCaseMetricsFeature[];
    isObservablesFeatureEnabled: boolean;
    isExtractObservablesEnabled: boolean;
}
export declare const useCasesFeatures: () => UseCasesFeatures;
