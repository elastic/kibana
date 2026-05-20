import type { CoreSetup } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { CustomVisualizationMigrations } from './migrations/types';
export declare function setupSavedObjects(core: CoreSetup, getFilterMigrations: () => MigrateFunctionsObject, customVisualizationMigrations: CustomVisualizationMigrations): void;
