import { ES_FIELD_TYPES } from '@kbn/field-types';
import { type Field, type Aggregation, type NewJobCaps, type RollupFields } from '@kbn/ml-anomaly-utils';
export declare const categoryFieldTypes: ES_FIELD_TYPES[];
export declare function combineFieldsAndAggs(fields: Field[], aggs: Aggregation[], rollupFields: RollupFields): NewJobCaps;
export declare function getGeoFields(fields: Field[]): Field[];
/**
 * Sort fields by name, keeping event rate at the beginning
 */
export declare function sortFields(fields: Field[]): Field[];
export declare function filterCategoryFields(fields: Field[], include?: boolean): Field[];
