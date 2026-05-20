import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { FullAgentPolicyOutputPermissions } from '../../../common/types';
export declare function getMonitoringPermissions(soClient: SavedObjectsClientContract, enabled: {
    logs: boolean;
    metrics: boolean;
    traces: boolean;
}, namespace: string): Promise<FullAgentPolicyOutputPermissions>;
