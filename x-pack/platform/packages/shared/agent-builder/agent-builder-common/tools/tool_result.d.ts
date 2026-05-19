import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '../attachments/attachment_types';
export declare enum ToolResultType {
    resource = "resource",
    resourceList = "resource_list",
    esqlResults = "esql_results",
    dashboard = "dashboard",
    query = "query",
    visualization = "visualization",
    other = "other",
    error = "error",
    fileReference = "file_reference"
}
interface ToolResultTypeDataMap {
    [ToolResultType.resource]: ResourceResultData;
    [ToolResultType.resourceList]: ResourceListData;
    [ToolResultType.esqlResults]: EsqlResultsData;
    [ToolResultType.dashboard]: DashboardResultData;
    [ToolResultType.query]: QueryResultData;
    [ToolResultType.visualization]: VisualizationResultData;
    [ToolResultType.error]: ErrorResultData;
    [ToolResultType.fileReference]: FileReferenceResultData;
    [ToolResultType.other]: OtherResultData;
}
export type ToolResultDataOf<Type extends ToolResultType> = ToolResultTypeDataMap[Type];
export interface ToolResultMixin<TType extends string = string, TData extends Object = Object> {
    tool_result_id: string;
    type: TType;
    data: TType extends ToolResultType.other ? TData : TType extends ToolResultType ? ToolResultDataOf<TType> : TData;
}
type UnknownToolType<T extends string> = T extends ToolResultType ? never : T;
export type KnownToolResult = {
    [K in ToolResultType]: ToolResultMixin<K>;
}[ToolResultType];
export type UnknownToolResult = ToolResultMixin<UnknownToolType<string>>;
export type ToolResult = KnownToolResult | UnknownToolResult;
export interface Resource {
    reference: {
        id: string;
        index: string;
    };
    title?: string;
    partial?: boolean;
    content: Record<string, unknown>;
}
export type ResourceResultData = Resource;
export type ResourceResult = ToolResultMixin<ToolResultType.resource>;
export interface ResourceListData {
    resources: Resource[];
}
export type ResourceListResult = ToolResultMixin<ToolResultType.resourceList>;
export interface EsqlResultsData {
    query: string;
    columns: EsqlEsqlColumnInfo[];
    values: FieldValue[][];
    /** Optional time range used for named parameters ?_tstart and ?_tend */
    time_range?: TimeRange;
}
export type EsqlResults = ToolResultMixin<ToolResultType.esqlResults>;
export interface DashboardResultData {
    id: string;
    title?: string;
    content: Record<string, unknown>;
}
export type DashboardResult = ToolResultMixin<ToolResultType.dashboard>;
export interface QueryResultData {
    esql: string;
}
export type QueryResult = ToolResultMixin<ToolResultType.query>;
export declare enum SupportedChartType {
    Metric = "metric",
    Gauge = "gauge",
    Tagcloud = "tagcloud",
    XY = "xy",
    RegionMap = "region_map",
    Heatmap = "heatmap",
    Datatable = "datatable",
    Pie = "pie",
    Treemap = "treemap",
    Waffle = "waffle",
    Mosaic = "mosaic"
}
export interface VisualizationResultData {
    visualization: Record<string, unknown>;
    chart_type: SupportedChartType;
    esql: string;
    time_range?: TimeRange;
}
export type VisualizationResult = ToolResultMixin<ToolResultType.visualization>;
export type OtherResultData<T extends Object = Object> = T;
export type OtherResult<T extends Object = Record<string, unknown>> = ToolResultMixin<ToolResultType.other, T>;
export interface ErrorResultData {
    message: string;
    stack?: unknown;
    metadata?: Record<string, unknown>;
}
export type ErrorResult = ToolResultMixin<ToolResultType.error>;
export interface FileReferenceResultData {
    filepath: string;
    comment: string;
}
export type FileReferenceResult = ToolResultMixin<ToolResultType.fileReference>;
export declare const isResourceResult: (result: ToolResult) => result is ResourceResult;
export declare const isResourceListResult: (result: ToolResult) => result is ResourceListResult;
export declare const isEsqlResultsResult: (result: ToolResult) => result is EsqlResults;
export declare const isQueryResult: (result: ToolResult) => result is QueryResult;
export declare const isOtherResult: <T extends Object = Record<string, unknown>>(result: ToolResult) => result is OtherResult<T>;
export declare const isErrorResult: (result: ToolResult) => result is ErrorResult;
export declare const isFileReferenceResult: (result: ToolResult) => result is FileReferenceResult;
export declare const isVisualizationResult: (result: ToolResult) => result is VisualizationResult;
export {};
