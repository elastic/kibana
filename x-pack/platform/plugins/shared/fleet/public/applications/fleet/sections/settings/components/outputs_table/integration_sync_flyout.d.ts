import React from 'react';
import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../../../../../common/types';
interface Props {
    onClose: () => void;
    outputName: string;
    syncedIntegrationsStatus?: GetRemoteSyncedIntegrationsStatusResponse;
    syncUninstalledIntegrations?: boolean;
}
export declare const IntegrationSyncFlyout: React.FunctionComponent<Props>;
export {};
