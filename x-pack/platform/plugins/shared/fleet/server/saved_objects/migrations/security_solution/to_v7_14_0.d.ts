import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { PackagePolicy } from '../../../../common';
export declare const migrateEndpointPackagePolicyToV7140: SavedObjectMigrationFn<PackagePolicy, PackagePolicy>;
