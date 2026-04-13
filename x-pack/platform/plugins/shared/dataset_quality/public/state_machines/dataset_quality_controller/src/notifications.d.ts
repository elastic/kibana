import type { IToasts } from '@kbn/core/public';
export declare const fetchDatasetTypesPrivilegesFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const fetchDatasetStatsFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const fetchDegradedStatsFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const fetchTotalDocsFailedNotifier: (toasts: IToasts, error: Error, meta: any) => void;
export declare const fetchIntegrationsFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const fetchFailedStatsFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const updateFailureStoreFailedNotifier: (toasts: IToasts, error: Error) => void;
export declare const updateFailureStoreSuccessNotifier: (toasts: IToasts) => void;
