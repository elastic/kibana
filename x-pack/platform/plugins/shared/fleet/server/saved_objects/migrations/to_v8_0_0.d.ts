import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { Installation, Output } from '../../../common/types';
export declare const migrateOutputToV800: SavedObjectMigrationFn<Output, Output>;
export declare const migrateInstallationToV800: SavedObjectMigrationFn<Installation, Installation>;
