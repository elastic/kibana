import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { MlJobFieldType } from '@kbn/ml-anomaly-utils';
export interface FieldRequestConfig {
    fieldName?: string;
    type: MlJobFieldType;
    cardinality: number;
}
export interface FieldHistogramRequestConfig {
    fieldName: string;
    type?: KBN_FIELD_TYPES;
}
