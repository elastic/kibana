import type { SupportedAggs } from './field_stats';
import type { Percentile, SupportedFieldType, FieldVisStats } from '.';
export interface MetricFieldVisStats {
    avg?: number;
    distribution?: {
        percentiles: Percentile[];
        maxPercentile: number;
        minPercentile: 0;
    };
    max?: number;
    median?: number;
    min?: number;
}
export interface FieldVisConfig {
    type: SupportedFieldType;
    fieldName: string;
    displayName?: string;
    existsInDocs: boolean;
    aggregatable: boolean;
    loading: boolean;
    secondaryType: string;
    stats?: FieldVisStats;
    fieldFormat?: any;
    isUnsupportedType?: boolean;
    deletable?: boolean;
    supportedAggs?: SupportedAggs;
}
export interface FileBasedFieldVisConfig {
    type: SupportedFieldType;
    fieldName?: string;
    displayName?: string;
    secondaryType?: string;
    stats?: FieldVisStats;
    format?: string;
}
export interface FileBasedUnknownFieldVisConfig {
    fieldName: string;
    type: 'text' | 'unknown';
    stats: {
        mean: number;
        count: number;
        sampleCount: number;
        cardinality: number;
    };
}
export declare function isFileBasedFieldVisConfig(field: FieldVisConfig | FileBasedFieldVisConfig): field is FileBasedFieldVisConfig;
export declare function isIndexBasedFieldVisConfig(field: FieldVisConfig | FileBasedFieldVisConfig): field is FieldVisConfig;
