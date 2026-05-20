import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatasourceMap, OperationDescriptor, VisualizationMap, LensDocument } from '@kbn/lens-common';
export type ChartInfoApi = Promise<{
    getChartInfo: (vis: LensDocument) => Promise<ChartInfo | undefined>;
}>;
export interface ChartInfo {
    layers: ChartLayerDescriptor[];
    visualizationType: string;
    filters: Filter[];
    query: Query | AggregateQuery;
}
export interface ChartLayerDescriptor {
    dataView?: DataView;
    layerId: string;
    layerType: string;
    chartType?: string;
    icon?: IconType;
    label?: string;
    dimensions: Array<{
        name: string;
        id: string;
        role: 'split' | 'metric';
        dimensionType: string;
        operation: OperationDescriptor & {
            type: string;
            fields?: string[];
            filter?: Query;
        };
    }>;
}
export declare const createChartInfoApi: (dataViews: DataViewsPublicPluginStart, visualizationMap: VisualizationMap, datasourceMap: DatasourceMap) => ChartInfoApi;
