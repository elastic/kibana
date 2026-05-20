import type { LensPublicStart, DataType, ChartInfo, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { Query } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
export declare const COMPATIBLE_SERIES_TYPES: string[];
export declare const COMPATIBLE_LAYER_TYPE: "data";
export declare const COMPATIBLE_VISUALIZATION = "lnsXY";
export declare const COMPATIBLE_SPLIT_FIELD_TYPES: DataType[];
export declare function redirectToADJobWizards(embeddable: LensApi, layerIndex: number, share: SharePluginStart, lens: LensPublicStart): Promise<void>;
export declare function getJobsItemsFromEmbeddable(embeddable: LensApi, lens?: LensPublicStart): Promise<{
    vis: Readonly<LensSavedObjectAttributes>;
    chartInfo: ChartInfo;
    from: string;
    to: string;
    query: Query;
    filters: import("@kbn/es-query").Filter[];
    dashboard: DashboardApi | undefined;
}>;
export declare function lensOperationToMlFunction(operationType: string): ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.DISTINCT_COUNT | ML_JOB_AGGREGATION.MIN | ML_JOB_AGGREGATION.MAX | ML_JOB_AGGREGATION.MEDIAN | ML_JOB_AGGREGATION.MEAN | ML_JOB_AGGREGATION.SUM | null;
export declare function getMlFunction(operationType: string): ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.DISTINCT_COUNT | ML_JOB_AGGREGATION.MIN | ML_JOB_AGGREGATION.MAX | ML_JOB_AGGREGATION.MEDIAN | ML_JOB_AGGREGATION.MEAN | ML_JOB_AGGREGATION.SUM;
export declare function getVisTypeFactory(lens: LensPublicStart): Promise<(layer: ChartInfo["layers"][number]) => {
    label: string;
    icon: import("@elastic/eui/src/components/icon/icon").IconType;
}>;
export declare function isCompatibleVisualizationType(chartInfo: ChartInfo): Promise<boolean>;
export declare function isCompatibleLayer(layer: ChartInfo['layers'][number]): boolean | "" | undefined;
export declare function isDataLayer(layer: ChartInfo['layers'][number]): boolean;
export declare function isTermsField(dimension: ChartInfo['layers'][number]['dimensions'][number]): boolean;
export declare function isCompatibleSplitFieldType(dimension: ChartInfo['layers'][number]['dimensions'][number]): boolean;
export declare function hasIncompatibleProperties(dimension: ChartInfo['layers'][number]['dimensions'][number]): true | Query | undefined;
export declare function createDetectors(fields: ChartInfo['layers'][number]['dimensions'], splitField?: ChartInfo['layers'][number]['dimensions'][number]): {
    partition_field_name?: string | undefined;
    field_name?: string | undefined;
    function: ML_JOB_AGGREGATION;
}[];
export declare function getChartInfoFromVisualization(lens: LensPublicStart, vis: LensSavedObjectAttributes): Promise<ChartInfo>;
