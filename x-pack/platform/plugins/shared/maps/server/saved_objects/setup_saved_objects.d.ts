import type { CoreSetup } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
export declare function setupSavedObjects(core: CoreSetup, getFilterMigrations: () => MigrateFunctionsObject, getDataViewMigrations: () => MigrateFunctionsObject): void;
/**
 * This creates a migration map that applies external data plugin migrations to persisted filter state stored in Maps
 */
export declare const getMapsFilterMigrations: (filterMigrations: MigrateFunctionsObject) => MigrateFunctionsObject;
/**
 * This creates a migration map that applies external data view plugin migrations to persisted data view state stored in Maps
 */
export declare const getMapsDataViewMigrations: (migrations: MigrateFunctionsObject) => MigrateFunctionsObject;
