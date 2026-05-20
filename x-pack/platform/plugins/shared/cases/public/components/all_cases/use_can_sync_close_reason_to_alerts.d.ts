interface CaseSyncSettings {
    syncAlerts: boolean;
}
interface CaseSyncInfo {
    totalAlerts: number;
    settings: CaseSyncSettings;
}
interface SingleCaseParams {
    totalAlerts: number;
    syncAlertsEnabled: boolean;
}
interface BulkCaseParams {
    selectedCases: CaseSyncInfo[];
}
type UseCanSyncCloseReasonToAlertsParams = SingleCaseParams | BulkCaseParams;
export declare const useCanSyncCloseReasonToAlerts: (params: UseCanSyncCloseReasonToAlertsParams) => boolean;
export {};
