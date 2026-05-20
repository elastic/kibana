import type { SavedObjectMigrationMap } from '@kbn/core/server';
import type { Query } from '@kbn/es-query';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { PersistableFilter } from '@kbn/lens-common';
import type { CustomVisualizationMigrations } from './types';
export interface LensDocShape<VisualizationState = unknown> {
    id?: string;
    type?: string;
    visualizationType: string | null;
    title: string;
    state: {
        datasourceStates: {
            indexpattern: {
                layers: Record<string, {
                    columnOrder: string[];
                    columns: Record<string, Record<string, unknown>>;
                }>;
            };
        };
        visualization: VisualizationState;
        query: Query;
        filters: PersistableFilter[];
        adHocDataViews?: Record<string, DataViewSpec>;
    };
}
export declare const getAllMigrations: (filterMigrations: MigrateFunctionsObject, dataViewMigrations: MigrateFunctionsObject, customVisualizationMigrations: CustomVisualizationMigrations) => SavedObjectMigrationMap;
