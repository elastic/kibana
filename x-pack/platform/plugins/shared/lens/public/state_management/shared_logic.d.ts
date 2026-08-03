import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { type VisualizationState, type DatasourceStates, type DatasourceMap, type VisualizationMap, type LensDocument, type Visualization } from '@kbn/lens-common';
export declare function mergeToNewDoc(persistedDoc: LensDocument | undefined, visualization: VisualizationState, datasourceStates: DatasourceStates, query: AggregateQuery | Query, filters: Filter[], activeDatasourceId: string | null, adHocDataViews: Record<string, DataViewSpec>, { datasourceMap, visualizationMap, extractFilterReferences, }: {
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    extractFilterReferences: FilterManager['extract'];
}): LensDocument | undefined;
/**
 * Converts runtime visualization state to its persisted (storage-ready) format
 * by delegating to the visualization's `getPersistableState` method.
 *
 * This is the same conversion that `mergeToNewDoc` performs for the full editor
 * save path — extracted here so the inline editor's `saveByRef` can reuse it.
 */
export declare function serializeVisualizationToSave<T extends {
    state: {
        visualization: unknown;
    };
}>(attrs: T, visualization: Pick<Visualization, 'getPersistableState'>): T;
export declare function getActiveDataFromDatatable(defaultLayerId: string, tables?: Record<string, Datatable>): Record<string, Datatable>;
