/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode } from 'react';

export interface DataTypeDefinition {
  label: string;
  value: DataType;
  documentation?: {
    main: string;
    [key: string]: string;
  };
  subTypes?: { label: string; types: SubType[] };
  description?: () => ReactNode;
}

export type MainType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'alias'
  | 'completion'
  | 'dense_vector'
  | 'flattened'
  | 'ip'
  | 'join'
  | 'percolator'
  | 'rank_feature'
  | 'rank_features'
  | 'shape'
  | 'search_as_you_type'
  | 'date'
  | 'date_nanos'
  | 'geo_point'
  | 'geo_shape'
  | 'token_count';

export type SubType = NumericType | RangeType;

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

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'ip_range'
  | 'double_range'
  | 'date_range';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'fielddata_frequency_filter'
  | 'fielddata_frequency_filter_percentage'
  | 'fielddata_frequency_filter_absolute'
  | 'doc_values'
  | 'doc_values_binary'
  | 'coerce'
  | 'coerce_shape'
  | 'ignore_malformed'
  | 'null_value'
  | 'null_value_numeric'
  | 'null_value_boolean'
  | 'null_value_geo_point'
  | 'null_value_ip'
  | 'copy_to'
  | 'dynamic'
  | 'dynamic_toggle'
  | 'dynamic_strict'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'index_options_flattened'
  | 'index_options_keyword'
  | 'eager_global_ordinals'
  | 'eager_global_ordinals_join'
  | 'index_prefixes'
  | 'index_phrases'
  | 'norms'
  | 'norms_keyword'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace'
  | 'scaling_factor'
  | 'max_input_length'
  | 'preserve_separators'
  | 'preserve_position_increments'
  | 'ignore_z_value'
  | 'enable_position_increments'
  | 'orientation'
  | 'points_only'
  | 'path'
  | 'dims'
  | 'depth_limit'
  | 'relations'
  | 'max_shingle_size';

interface FieldBasic {
  name: string;
  type: DataType;
  subType?: SubType;
  properties?: { [key: string]: Omit<Field, 'name'> };
  fields?: { [key: string]: Omit<Field, 'name'> };
}

type FieldParams = {
  [K in ParameterName]: unknown;
};

export type Field = FieldBasic & Partial<FieldParams>;

export interface GenericObject {
  [key: string]: any;
}
