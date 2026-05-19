import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataFrameAnalyticsConfig } from './types';
/**
 * ES id _id
 */
export type EsId = string;
/**
 * ES source _source
 */
export type EsDocSource = Record<string, any>;
/**
 * ES field name
 */
export type EsFieldName = string;
/**
 * ES doc
 */
export interface EsDoc extends Record<string, any> {
    /**
     * ES _id
     */
    _id: EsId;
    /**
     * ES _source
     */
    _source: EsDocSource;
}
/**
 * Max columns
 */
export declare const MAX_COLUMNS = 10;
/**
 * Default regression columns
 */
export declare const DEFAULT_REGRESSION_COLUMNS = 8;
/**
 * Set of basic numerical types
 */
export declare const BASIC_NUMERICAL_TYPES: Set<ES_FIELD_TYPES>;
/**
 * Set of extended numerical types
 */
export declare const EXTENDED_NUMERICAL_TYPES: Set<ES_FIELD_TYPES>;
/**
 * ES field name for copy of the doc _id
 */
export declare const ML__ID_COPY = "ml__id_copy";
/**
 * ES field name for ML's incremental id
 */
export declare const ML__INCREMENTAL_ID = "ml__incremental_id";
/**
 * Used to sort columns:
 * - Anchor on the left ml.outlier_score, ml.is_training, <predictedField>, <actual>
 * - string based columns are moved to the left
 * - feature_influence/feature_importance fields get moved next to the corresponding field column
 * - overall fields get sorted alphabetically
 *
 * @param {string} a First field name to compare for sorting
 * @param {string} b Second field name to compare for sorting
 * @param {DataFrameAnalyticsConfig} jobConfig The DFA analysis config
 * @returns {*}
 */
export declare const sortExplorationResultsFields: (a: string, b: string, jobConfig: DataFrameAnalyticsConfig) => number;
