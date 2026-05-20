import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { AgentPolicy, PackagePolicy, Settings } from '../../types';
export declare const migrateAgentPolicyToV7100: SavedObjectMigrationFn<Omit<AgentPolicy, 'package_policies'> & {
    package_configs: string[];
    package_policies?: string[];
}, Omit<AgentPolicy, 'package_policies'> & {
    package_policies?: string[];
}>;
export declare const migratePackagePolicyToV7100: SavedObjectMigrationFn<Exclude<PackagePolicy, 'policy_id'> & {
    config_id: string;
}, PackagePolicy>;
export declare const migrateSettingsToV7100: SavedObjectMigrationFn<Exclude<Settings, 'kibana_urls'> & {
    kibana_url: string;
}, Settings>;
