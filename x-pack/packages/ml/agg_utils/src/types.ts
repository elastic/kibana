/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';

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
 * Represents an item set returned from `frequent_item_sets` augmented
 * with some metadata related to log rate analysis.
 */
export interface ItemSet {
  /** An array of field-value pairs representing the items in the set. */
  set: FieldValuePair[];
  /** The size of the item set. */
  size: number;
  /** The maximum p-value associated with the item set. */
  maxPValue: number;
  /** The document count of the item set. */
  doc_count: number;
  /** The support value of the item set. */
  support: number;
  /** The total document count. */
  total_doc_count: number;
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
 * Enumeration of significant item types.
 */
export const SIGNIFICANT_ITEM_TYPE = {
  KEYWORD: 'keyword',
  LOG_PATTERN: 'log_pattern',
} as const;

/**
 * Type for significant item type keys.
 */
type SignificantItemTypeKeys = keyof typeof SIGNIFICANT_ITEM_TYPE;

/**
 * Represents the type of significant item as determined by the SIGNIFICANT_ITEM_TYPE enumeration.
 */
export type SignificantItemType = typeof SIGNIFICANT_ITEM_TYPE[SignificantItemTypeKeys];

/**
 * Represents significant item metadata for a field/value pair.
 * This interface is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not related to the generic
 * significant terms aggregation type.
 *
 * @interface
 * @extends FieldValuePair
 */
export interface SignificantItem extends FieldValuePair {
  /** The key associated with the significant item. */
  key: string;

  /** The type of the significant item. */
  type: SignificantItemType;

  /** The document count for the significant item. */
  doc_count: number;

  /** The background count for the significant item. */
  bg_count: number;

  /** The total document count for all items. */
  total_doc_count: number;

  /** The total background count for all items. */
  total_bg_count: number;

  /** The score associated with the significant item. */
  score: number;

  /** The p-value for the significant item, or null if not available. */
  pValue: number | null;

  /** The normalized score for the significant item. */
  normalizedScore: number;

  /** An optional histogram for the significant item. */
  histogram?: SignificantItemHistogramItem[];

  /** Indicates if the significant item is unique within a group. */
  unique?: boolean;
}

interface SignificantItemHistogramItemBase {
  /** The document count for this item in the overall context. */
  doc_count_overall: number;

  /** The numeric key associated with this item. */
  key: number;

  /** The string representation of the key. */
  key_as_string: string;
}

/**
 * @deprecated since version 2 of internal log rate analysis REST API endpoint
 */
interface SignificantItemHistogramItemV1 extends SignificantItemHistogramItemBase {
  /** The document count for this item in the significant term context. */
  doc_count_significant_term: number;
}

interface SignificantItemHistogramItemV2 extends SignificantItemHistogramItemBase {
  /** The document count for this histogram item in the significant item context. */
  doc_count_significant_item: number;
}

/**
 * Represents a data item in a significant term histogram.
 */
export type SignificantItemHistogramItem =
  | SignificantItemHistogramItemV1
  | SignificantItemHistogramItemV2;

/**
 * Represents histogram data for a field/value pair.
 * @interface
 */
export interface SignificantItemHistogram extends FieldValuePair {
  /** An array of significant item histogram items. */
  histogram: SignificantItemHistogramItem[];
}

/**
 * Represents histogram data for a group of field/value pairs.
 * @interface
 */
export interface SignificantItemGroupHistogram {
  /** The identifier for the group. */
  id: string;

  /** An array of significant item histogram items. */
  histogram: SignificantItemHistogramItem[];
}

/**
 * Represents an item in a significant item group.
 * @interface
 */
export interface SignificantItemGroupItem extends FieldValuePair {
  /** The key associated with the significant item. */
  key: string;

  /** The type of the significant item. */
  type: SignificantItemType;

  /** The document count associated with this item. */
  docCount: number;

  /** The p-value for this item, or null if not available. */
  pValue: number | null;

  /** An optional number of duplicates. */
  duplicate?: number;
}

/**
 * Represents a significant item group.
 * @interface
 */
export interface SignificantItemGroup {
  /** The identifier for the item. */
  id: string;

  /** An array of significant item group items. */
  group: SignificantItemGroupItem[];

  /** The document count associated with this item. */
  docCount: number;

  /** The p-value for this item, or null if not available. */
  pValue: number | null;

  /** An optional array of significant item histogram items. */
  histogram?: SignificantItemHistogramItem[];
}
