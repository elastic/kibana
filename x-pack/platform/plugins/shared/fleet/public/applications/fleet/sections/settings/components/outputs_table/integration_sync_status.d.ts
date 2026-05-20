import React from 'react';
import { SyncStatus, type Output } from '../../../../../../../common/types';
interface Props {
    output: Output;
}
export declare function getIntegrationStatus(statuses: SyncStatus[]): SyncStatus;
export declare const IntegrationSyncStatus: React.FunctionComponent<Props>;
export {};
