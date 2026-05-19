import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { Settings } from '../../../common/types';
import type { Installation } from '../../../common';
import type { PackagePolicy } from '../../../common';
export declare const migrateSettingsToV860: SavedObjectMigrationFn<Settings, Settings>;
export declare const migrateInstallationToV860: SavedObjectMigrationFn<Installation, Installation>;
export declare const migratePackagePolicyToV860: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
