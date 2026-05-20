export type { SupportedFieldType } from './job_field_type';
export type { FieldRequestConfig, DocumentCountBuckets, DocumentCounts, FieldVisStats, Percentile, } from './field_request_config';
export interface DataVisualizerTableState {
    pageSize: number;
    pageIndex: number;
    sortField: string;
    sortDirection: string;
    visibleFieldTypes: string[];
    visibleFieldNames: string[];
    showDistributions: boolean;
}
