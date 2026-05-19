import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../common';
import type { AgentPolicy } from '../../types';
export declare const migratePackagePolicyToV850: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
export declare const migrateAgentPolicyToV850: SavedObjectMigrationFn<Exclude<AgentPolicy, 'download_source_id'> & {
    package_policies: string[];
}, AgentPolicy>;
