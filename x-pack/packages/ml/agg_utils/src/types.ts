/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

/**
 * Represents a field-based cardinality aggregation configuration.
 * @interface
 */
interface FieldAggCardinality {
  /** The field on which the cardinality aggregation is applied. */
  field: string;

  /** Optional property percent. */
  percent?: any;
}

/**
 * Represents a script-based cardinality aggregation configuration.
 * @interface
 */
interface ScriptAggCardinality {
  /** The script used for the cardinality aggregation. */
  script: any;
}

/**
 * Interface for cardinality aggregation.
 * @interface
 */
export interface AggCardinality {
  /** The cardinality aggregation configuration */
  cardinality: FieldAggCardinality | ScriptAggCardinality;
}

/**
 * Field/value pair definition.
 */
export interface FieldValuePair {
  /** The field name. */
  fieldName: string;
  /**
   * For dynamic fieldValues we only identify fields as `string`,
   * but for example `http.response.status_code` which is part of
   * of the list of predefined field candidates is of type long/number
   */
  fieldValue: string | number;
}

/**
 * Interface describing attributes used for numeric histograms.
 * @interface
 */
export interface NumericColumnStats {
  /** The interval value for the histogram. */
  interval: number;

  /** The minimum value in the histogram. */
  min: number;

  /** The maximum value in the histogram. */
  max: number;
}

/**
 * Record/Map of histogram attributes where the key is the aggregation name.
 */
export type NumericColumnStatsMap = Record<string, NumericColumnStats>;

/**
 * Represents parameters used to identify which histogram data needs to be generated for a field.
 * @interface
 */
export interface HistogramField {
  /**
   * The name of the field for which histogram data is generated.
   */
  fieldName: string;

  /**
   * The type of the field, using Kibana field types.
   */
  type: KBN_FIELD_TYPES;
}

/**
 * Enumeration of significant term types.
 */
export const SIGNIFICANT_TERM_TYPE = {
  KEYWORD: 'keyword',
  LOG_PATTERN: 'log_pattern',
} as const;

/**
 * Type for significant term type keys.
 */
type SignificantTermTypeKeys = keyof typeof SIGNIFICANT_TERM_TYPE;

/**
 * Represents the type of significant term as determined by the SIGNIFICANT_TERM_TYPE enumeration.
 */
export type SignificantTermType = typeof SIGNIFICANT_TERM_TYPE[SignificantTermTypeKeys];

/**
 * Represents significant term metadata for a field/value pair.
 * This interface is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not related to the generic
 * significant terms aggregation type.
 *
 * @interface
 * @extends FieldValuePair
 */
export interface SignificantTerm extends FieldValuePair {
  /** The key associated with the significant term. */
  key: string;

  /** The type of the significant term. */
  type: SignificantTermType;

  /** The document count for the significant term. */
  doc_count: number;

  /** The background count for the significant term. */
  bg_count: number;

  /** The total document count for all terms. */
  total_doc_count: number;

  /** The total background count for all terms. */
  total_bg_count: number;

  /** The score associated with the significant term. */
  score: number;

  /** The p-value for the significant term, or null if not available. */
  pValue: number | null;

  /** The normalized score for the significant term. */
  normalizedScore: number;

  /** An optional histogram of significant term items. */
  histogram?: SignificantTermHistogramItem[];

  /** Indicates if the significant term is unique within a group. */
  unique?: boolean;
}

/**
 * Represents a data item in a significant term histogram.
 * @interface
 */
export interface SignificantTermHistogramItem {
  /** The document count for this item in the overall context. */
  doc_count_overall: number;

  /** The document count for this item in the significant term context. */
  doc_count_significant_term: number;

  /** The numeric key associated with this item. */
  key: number;

  /** The string representation of the key. */
  key_as_string: string;
}

/**
 * Represents histogram data for a field/value pair.
 * @interface
 */
export interface SignificantTermHistogram extends FieldValuePair {
  /** An array of significant term histogram items. */
  histogram: SignificantTermHistogramItem[];
}

/**
 * Represents histogram data for a group of field/value pairs.
 * @interface
 */
export interface SignificantTermGroupHistogram {
  /** The identifier for the group. */
  id: string;

  /** An array of significant term histogram items. */
  histogram: SignificantTermHistogramItem[];
}

/**
 * Represents an item in a significant term group.
 * @interface
 */
export interface SignificantTermGroupItem extends FieldValuePair {
  /** The key associated with the significant term. */
  key: string;

  /** The type of the significant term. */
  type: SignificantTermType;

  /** The document count associated with this item. */
  docCount: number;

  /** The p-value for this item, or null if not available. */
  pValue: number | null;

  /** An optional number of duplicates. */
  duplicate?: number;
}

/**
 * Represents a significant term group.
 * @interface
 */
export interface SignificantTermGroup {
  /** The identifier for the item. */
  id: string;

  /** An array of significant term group items. */
  group: SignificantTermGroupItem[];

  /** The document count associated with this item. */
  docCount: number;

  /** The p-value for this item, or null if not available. */
  pValue: number | null;

  /** An optional array of significant term histogram items. */
  histogram?: SignificantTermHistogramItem[];
}
