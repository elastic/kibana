import React from 'react';
import type { RemoteSyncedCustomAssetsStatus, RemoteSyncedIntegrationsStatus } from '../../../../../../../common/types';
export declare const IntegrationStatus: React.FunctionComponent<{
    integration: RemoteSyncedIntegrationsStatus;
    customAssets: RemoteSyncedCustomAssetsStatus[];
    syncUninstalledIntegrations?: boolean;
    'data-test-subj'?: string;
}>;
