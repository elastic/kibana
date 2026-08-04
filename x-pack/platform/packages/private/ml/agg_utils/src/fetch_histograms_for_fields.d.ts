import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { HistogramField, NumericColumnStats } from './types';
/**
 * Represents an item in numeric data.
 * @interface
 */
export interface NumericDataItem {
    /**
     * The numeric key.
     */
    key: number;
    /**
     * An optional string representation of the key.
     */
    key_as_string?: string;
    /**
     * The document count associated with the key.
     */
    doc_count: number;
}
/**
 * Interface describing the data structure returned for numeric-based charts.
 * @interface
 */
export interface NumericChartData {
    /**
     * An array of data points, each represented by a NumericDataItem.
     */
    data: NumericDataItem[];
    /**
     * The identifier for the data set.
     */
    id: string;
    /**
     * The interval value for the data.
     */
    interval: number;
    /**
     * An array of statistics values, typically [min, max].
     */
    stats: [number, number];
    /**
     * The type of chart, which is 'numeric'.
     */
    type: 'numeric';
}
/**
 * Numeric based histogram field interface, limited to `date` and `number`.
 */
export interface NumericHistogramField extends HistogramField {
    /**
     * The type of the numeric histogram field.
     */
    type: KBN_FIELD_TYPES.DATE | KBN_FIELD_TYPES.NUMBER;
}
type NumericHistogramFieldWithColumnStats = NumericHistogramField & NumericColumnStats;
interface OrdinalDataItem {
    key: string;
    key_as_string?: string;
    doc_count: number;
}
interface OrdinalChartData {
    type: 'ordinal' | 'boolean';
    cardinality: number;
    data: OrdinalDataItem[];
    id: string;
}
interface OrdinalHistogramField extends HistogramField {
    type: KBN_FIELD_TYPES.STRING | KBN_FIELD_TYPES.BOOLEAN;
}
interface UnsupportedChartData {
    id: string;
    type: 'unsupported';
}
interface UnsupportedHistogramField extends HistogramField {
    type: Exclude<KBN_FIELD_TYPES, KBN_FIELD_TYPES.STRING | KBN_FIELD_TYPES.BOOLEAN | KBN_FIELD_TYPES.DATE | KBN_FIELD_TYPES.NUMBER>;
}
/**
 * All types of histogram field definitions for fetching histogram data.
 */
export type FieldsForHistograms = Array<NumericHistogramField | NumericHistogramFieldWithColumnStats | OrdinalHistogramField | UnsupportedHistogramField>;
interface FetchHistogramsForFieldsParams {
    /** The Elasticsearch client to use for the query. */
    esClient: ElasticsearchClient;
    /** An optional abort signal to cancel the request. */
    abortSignal?: AbortSignal;
    /** The arguments for the aggregation query. */
    arguments: {
        /** The index pattern to query against. */
        indexPattern: string;
        /** The query to filter documents. */
        query: any;
        /** The fields for which histograms are to be fetched. */
        fields: FieldsForHistograms;
        /** The size of the sampler shard. */
        samplerShardSize: number;
        /** Optional runtime mappings for the query. */
        runtimeMappings?: estypes.MappingRuntimeFields;
        /** Optional project routing for the query. */
        projectRouting?: string;
        /** Optional probability for random sampling. */
        randomSamplerProbability?: number;
        /** Optional seed for random sampling. */
        randomSamplerSeed?: number;
    };
}
/**
 * Asynchronously fetches histograms for specified fields from an Elasticsearch client.
 *
 * @param params The parameters for fetching histograms.
 * @returns A promise that resolves with the fetched histograms.
 */
export declare const fetchHistogramsForFields: (params: FetchHistogramsForFieldsParams) => Promise<(NumericChartData | OrdinalChartData | UnsupportedChartData)[]>;
export {};
