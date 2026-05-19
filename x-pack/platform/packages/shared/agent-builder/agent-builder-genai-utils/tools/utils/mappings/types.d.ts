import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
/**
 * Represents the relevant information of an field
 */
export interface MappingField {
    /** the path of the field */
    path: string;
    /** the type of the field */
    type: string;
    /** meta attached to the field */
    meta: Record<string, string>;
    /** whether the field is searchable (defaults to true when not set) */
    searchable?: boolean;
    /** true if the field is a TSDB dimension */
    tsDimension?: boolean;
    /** the TSDB metric type, when the field is a TSDB metric */
    tsMetric?: MappingTimeSeriesMetricType;
}
