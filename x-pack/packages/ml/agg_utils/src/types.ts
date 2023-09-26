/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

interface FieldAggCardinality {
  field: string;
  percent?: any;
}

interface ScriptAggCardinality {
  script: any;
}

/**
 * Interface for cardinality aggregation.
 */
export interface AggCardinality {
  cardinality: FieldAggCardinality | ScriptAggCardinality;
}

/**
 * Field/value pair definition.
 */
export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
}

/**
 * Interface to describe attributes used for histograms.
 */
export interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}

/**
 * Record/Map of histogram attributes where the key is the aggregation name.
 */
export type NumericColumnStatsMap = Record<string, NumericColumnStats>;

/**
 * Parameters to identify which histogram data needs to be generated for a field.
 */
export interface HistogramField {
  fieldName: string;
  type: KBN_FIELD_TYPES;
}

/**
 * Significant term meta data for a field/value pair.
 * Note this is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not a generic significant terms
 * aggregation type.
 */
export interface SignificantTerm extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  total_doc_count: number;
  total_bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  histogram?: SignificantTermHistogramItem[];
  unique?: boolean;
}

/**
 * Significant term histogram data item.
 */
export interface SignificantTermHistogramItem {
  doc_count_overall: number;
  doc_count_significant_term: number;
  key: number;
  key_as_string: string;
}

/**
 * Histogram data for a field/value pair.
 */
export interface SignificantTermHistogram extends FieldValuePair {
  histogram: SignificantTermHistogramItem[];
}

/**
 * Histogram data for a group of field/value pairs.
 */
export interface SignificantTermGroupHistogram {
  id: string;
  histogram: SignificantTermHistogramItem[];
}

export interface SignificantTermGroupItem extends FieldValuePair {
  docCount: number;
  pValue: number | null;
  duplicate?: number;
}

/**
 * Tree leaves
 */
export interface SignificantTermGroup {
  id: string;
  group: SignificantTermGroupItem[];
  docCount: number;
  pValue: number | null;
  histogram?: SignificantTermHistogramItem[];
}
