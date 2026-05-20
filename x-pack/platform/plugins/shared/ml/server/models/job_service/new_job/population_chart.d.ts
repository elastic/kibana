import type { IScopedClusterClient } from '@kbn/core/server';
import { type AggFieldNamePair } from '@kbn/ml-anomaly-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
type TimeStamp = number;
type Value = number | undefined | null;
interface Thing {
    label: string;
    value: Value;
}
interface Result {
    time: TimeStamp;
    values: Thing[];
}
export interface ProcessedResults {
    success: boolean;
    results: Record<number, Result[]>;
    totalResults: number;
}
export declare function newJobPopulationChartProvider({ asCurrentUser }: IScopedClusterClient): {
    newJobPopulationChart: (indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: object, aggFieldNamePairs: AggFieldNamePair[], splitFieldName: string | null, runtimeMappings: RuntimeMappings | undefined, indicesOptions: IndicesOptions | undefined) => Promise<ProcessedResults>;
};
export {};
