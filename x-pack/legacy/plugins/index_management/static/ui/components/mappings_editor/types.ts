/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DataTypeDefinition {
  label: string;
  subTypes?: { label: string; types: SubType[] };
  configuration?: ParameterName[];
  basicParameters?: ParameterName[] | ParameterName[][];
  hasAdvancedParameters?: boolean;
  hasMultiFields?: boolean;
}

export type MainType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'date'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'ip'
  | 'rank_feature'
  | 'rank_features'
  | 'dense_vector'
  | 'sparse_vector';

export type SubType = NumericType | DateType | RangeType;

export type DataType = MainType | SubType;

export type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float';

export type DateType = 'date' | 'date_nanos';

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'double_range'
  | 'date_range';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'doc_values'
  | 'coerce'
  | 'ignore_malformed'
  | 'null_value'
  | 'dynamic'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'eager_global_ordinals'
  | 'index_prefixes'
  | 'index_phrases'
  | 'norms'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace';

export interface Properties {
  [key: string]: Property;
}

export interface Property {
  name: string;
  type: DataType;
  properties?: { [key: string]: Property };
  fields?: { [key: string]: Property };
  __childProperties__?: string[];
  [key: string]: any;
}
