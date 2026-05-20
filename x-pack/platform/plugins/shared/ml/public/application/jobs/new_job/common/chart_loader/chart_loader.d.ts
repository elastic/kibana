import type { DataView } from '@kbn/data-views-plugin/common';
import type { Field, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { MlApi } from '../../../../services/ml_api_service';
type DetectorIndex = number;
export interface LineChartPoint {
    time: number | string;
    value: number;
}
type SplitFieldValue = string | null;
export type LineChartData = Record<DetectorIndex, LineChartPoint[]>;
export declare class ChartLoader {
    protected _dataView: DataView;
    protected _mlApi: MlApi;
    private _timeFieldName;
    private _query;
    private _newJobLineChart;
    private _newJobPopulationsChart;
    private _getEventRateData;
    private _getCategoryFields;
    constructor(mlApi: MlApi, indexPattern: DataView, query: object);
    loadLineCharts(start: number, end: number, aggFieldPairs: AggFieldPair[], splitField: SplitField, splitFieldValue: SplitFieldValue, intervalMs: number, runtimeMappings: RuntimeMappings | null, indicesOptions?: IndicesOptions): Promise<LineChartData>;
    loadPopulationCharts(start: number, end: number, aggFieldPairs: AggFieldPair[], splitField: SplitField, intervalMs: number, runtimeMappings: RuntimeMappings | null, indicesOptions?: IndicesOptions): Promise<LineChartData>;
    loadEventRateChart(start: number, end: number, intervalMs: number, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions): Promise<LineChartPoint[]>;
    loadFieldExampleValues(field: Field, runtimeMappings: RuntimeMappings | null, indicesOptions?: IndicesOptions): Promise<string[]>;
}
export declare function getAggFieldPairNames(af: AggFieldPair): {
    agg: string;
    field: string;
    by: {
        field: string;
        value: string;
    } | {
        field: null;
        value: null;
    };
};
export {};
