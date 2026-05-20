import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { Settings } from '../../types';
import type { Output, PackagePolicy } from '../../../common';
export declare const migrateSettingsToV7130: SavedObjectMigrationFn<Settings & {
    package_auto_upgrade: string;
    agent_auto_upgrade: string;
    kibana_urls: string;
}, Settings>;
export declare const migrateOutputToV7130: SavedObjectMigrationFn<Output & {
    fleet_enroll_password: string;
    fleet_enroll_username: string;
}, Output>;
export declare const migratePackagePolicyToV7130: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
