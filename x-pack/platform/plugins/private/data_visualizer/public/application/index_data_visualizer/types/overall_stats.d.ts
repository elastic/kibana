import type { DocumentCountStats } from '../../../../common/types/field_stats';
import type { SupportedFieldType } from '../../../../common/types';
export interface AggregatableField {
    fieldName: string;
    stats: {
        cardinality?: number;
        count?: number;
        sampleCount?: number;
    };
    existsInDocs: boolean;
}
export interface NonAggregatableField {
    fieldName: string;
    stats?: {
        cardinality?: number;
        count?: number;
        sampleCount?: number;
    };
    existsInDocs: boolean;
    secondaryType?: SupportedFieldType;
}
export interface OverallStats {
    totalCount: number;
    documentCountStats?: DocumentCountStats;
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
    nonAggregatableExistsFields: NonAggregatableField[];
    nonAggregatableNotExistsFields: NonAggregatableField[];
}
