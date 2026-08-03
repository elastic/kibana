import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { CustomVisualizationMigrations } from '../migrations/types';
import type { LensEmbeddableRegistryDefinition } from './types';
export declare const makeLensEmbeddableFactory: (getFilterMigrations: () => MigrateFunctionsObject, getDataViewMigrations: () => MigrateFunctionsObject, customVisualizationMigrations: CustomVisualizationMigrations) => () => LensEmbeddableRegistryDefinition;
