import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function upgradeAgentPolicySchemaVersion(soClient: SavedObjectsClientContract): Promise<void>;
