/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

// TODO Temporary type definition until we can import from `@kbn/core`.
// Copied from src/core/server/elasticsearch/client/types.ts
// as these types aren't part of any package yet. Once they are, remove this completely

/**
 * Client used to query the elasticsearch cluster.
 * @deprecated At some point use the one from src/core/server/elasticsearch/client/types.ts when it is made into a package. If it never is, then keep using this one.
 * @public
 */
export type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

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
 * Change point meta data for a field/value pair.
 */
export interface ChangePoint extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  histogram?: ChangePointHistogramItem[];
}

/**
 * Change point histogram data item.
 */
export interface ChangePointHistogramItem {
  doc_count_overall: number;
  doc_count_change_point: number;
  key: number;
  key_as_string: string;
}

/**
 * Change point histogram data for a field/value pair.
 */
export interface ChangePointHistogram extends FieldValuePair {
  histogram: ChangePointHistogramItem[];
}
