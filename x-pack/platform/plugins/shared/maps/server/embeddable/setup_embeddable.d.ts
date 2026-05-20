import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
export declare function setupEmbeddable(embeddable: EmbeddableSetup, getFilterMigrations: () => MigrateFunctionsObject, getDataViewMigrations: () => MigrateFunctionsObject): void;
