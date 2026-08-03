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
    /**
     * True when at least one case setting is available to toggle (alert syncing, observable
     * extraction, or metrics). Mirrors the switches rendered by `CaseSettingsPopover`. When false
     * (e.g. Observability and Stack, which enable none of these), the case settings button and its
     * tour step have nothing to show and should be hidden.
     */
    hasCaseSettings: boolean;
}
export declare const useCasesFeatures: () => UseCasesFeatures;
