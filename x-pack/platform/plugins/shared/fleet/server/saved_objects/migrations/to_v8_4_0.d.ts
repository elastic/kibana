import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../common';
import type { Installation } from '../../../common';
import type { AgentPolicy } from '../../types';
export declare const migrateInstallationToV840: SavedObjectMigrationFn<Installation, Installation>;
export declare const migrateAgentPolicyToV840: SavedObjectMigrationFn<Exclude<AgentPolicy, 'download_source_id'> & {
    config_id: string;
}, AgentPolicy>;
export declare const migratePackagePolicyToV840: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
