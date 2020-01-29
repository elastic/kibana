/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParameterName } from '../types';

/**
 * Single source of truth for the parameters a user can change on _any_ field type.
 * It is also the single source of truth for the parameters default values.
 *
 * As a consequence, if a parameter is *not* declared here, we won't be able to declare it in the Json editor.
 */
export const PARAMETERS_DEFINITION: { [key in ParameterName]: boolean } = {
  name: true,
  type: true,
  store: true,
  index: true,
  doc_values: true,
  doc_values_binary: true,
  fielddata: true,
  fielddata_frequency_filter: true,
  fielddata_frequency_filter_percentage: true,
  fielddata_frequency_filter_absolute: true,
  coerce: true,
  coerce_shape: true,
  ignore_malformed: true,
  null_value: true,
  null_value_ip: true,
  null_value_numeric: true,
  null_value_boolean: true,
  null_value_geo_point: true,
  copy_to: true,
  max_input_length: true,
  locale: true,
  orientation: true,
  boost: true,
  scaling_factor: true,
  dynamic: true,
  dynamic_toggle: true,
  dynamic_strict: true,
  enabled: true,
  format: true,
  analyzer: true,
  search_analyzer: true,
  search_quote_analyzer: true,
  normalizer: true,
  index_options: true,
  index_options_keyword: true,
  index_options_flattened: true,
  eager_global_ordinals: true,
  eager_global_ordinals_join: true,
  index_phrases: true,
  preserve_separators: true,
  preserve_position_increments: true,
  ignore_z_value: true,
  points_only: true,
  norms: true,
  norms_keyword: true,
  term_vector: true,
  path: true,
  position_increment_gap: true,
  index_prefixes: true,
  similarity: true,
  split_queries_on_whitespace: true,
  ignore_above: true,
  enable_position_increments: true,
  depth_limit: true,
  dims: true,
  relations: true,
  max_shingle_size: true,
};
