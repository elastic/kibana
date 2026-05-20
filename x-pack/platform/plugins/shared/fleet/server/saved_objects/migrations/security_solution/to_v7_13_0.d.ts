import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const migrateEndpointPackagePolicyToV7130: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
