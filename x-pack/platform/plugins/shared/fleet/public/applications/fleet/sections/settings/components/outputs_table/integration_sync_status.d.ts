import React from 'react';
import type { SyncStatus} from '../../../../../../../common/types';
import { type Output } from '../../../../../../../common/types';
interface Props {
    output: Output;
}
export declare function getIntegrationStatus(statuses: SyncStatus[]): SyncStatus;
export declare const IntegrationSyncStatus: React.FunctionComponent<Props>;
export {};
