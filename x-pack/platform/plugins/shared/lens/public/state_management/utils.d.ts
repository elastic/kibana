import type { Datasource, DatasourceMap, DatasourceLayers, DatasourceStates, DataViewsState, FramePublicAPI } from '@kbn/lens-common';
/**
 * Creates an updated FramePublicAPI with the new datasource state for a specific layer.
 */
export declare function getUpdatedFrameWithDatasourceState(framePublicAPI: FramePublicAPI, datasource: Datasource, newDatasourceState: unknown, layerId: string): FramePublicAPI;
export declare const getDatasourceLayers: import("memoize-one").MemoizedFn<(this: any, datasourceStates: DatasourceStates, datasourceMap: DatasourceMap, indexPatterns: DataViewsState["indexPatterns"]) => DatasourceLayers>;
