import type { RemoteSyncedCustomAssetsRecord, RemoteSyncedIntegrationsStatus } from '../models';
export interface GetRemoteSyncedIntegrationsStatusResponse {
    integrations: RemoteSyncedIntegrationsStatus[];
    custom_assets?: RemoteSyncedCustomAssetsRecord;
    error?: string;
    warning?: {
        title: string;
        message?: string;
    };
}
