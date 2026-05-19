import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { FleetConfigType } from '../../config';
export declare function getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig(config?: FleetConfigType): boolean | undefined;
export declare function ensureDeleteUnenrolledAgentsSetting(soClient: SavedObjectsClientContract, enableDeleteUnenrolledAgents?: boolean): Promise<void>;
