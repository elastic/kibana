/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { ParameterName } from '../types';

/**
 * Single source of truth for the parameters a user can change on _any_ field type.
 * It is also the single source of truth for the parameters default values.
 *
 * As a consequence, if a parameter is *not* declared here, we won't be able to declare it in the Json editor.
 */
export const PARAMETERS_DEFINITION: { [key in ParameterName]: { schema?: any } } = {
  name: { schema: t.string },
  type: { schema: t.string },
  store: { schema: t.boolean },
  index: { schema: t.boolean },
  doc_values: { schema: t.boolean },
  doc_values_binary: { schema: t.boolean },
  fielddata: { schema: t.boolean },
  fielddata_frequency_filter: {
    schema: t.record(
      t.union([t.literal('min'), t.literal('max'), t.literal('min_segment_size')]),
      t.number
    ),
  },
  fielddata_frequency_filter_percentage: {
    schema: t.record(
      t.union([t.literal('min'), t.literal('max'), t.literal('min_segment_size')]),
      t.number
    ),
  },
  fielddata_frequency_filter_absolute: {
    schema: t.record(
      t.union([t.literal('min'), t.literal('max'), t.literal('min_segment_size')]),
      t.number
    ),
  },
  coerce: { schema: t.boolean },
  coerce_shape: { schema: t.boolean },
  ignore_malformed: { schema: t.boolean },
  null_value: {},
  null_value_ip: {},
  null_value_numeric: { schema: t.number },
  null_value_boolean: {
    schema: t.union([t.literal(true), t.literal(false), t.literal('true'), t.literal('false')]),
  },
  null_value_geo_point: {},
  copy_to: { schema: t.string },
  max_input_length: { schema: t.number },
  locale: { schema: t.string },
  orientation: { schema: t.string },
  boost: { schema: t.number },
  scaling_factor: { schema: t.number },
  dynamic: { schema: t.union([t.boolean, t.literal('strict')]) },
  dynamic_toggle: {},
  dynamic_strict: {},
  enabled: { schema: t.boolean },
  format: { schema: t.string },
  analyzer: { schema: t.string },
  search_analyzer: { schema: t.string },
  search_quote_analyzer: { schema: t.string },
  normalizer: { schema: t.string },
  index_options: { schema: t.string },
  index_options_keyword: { schema: t.string },
  index_options_flattened: { schema: t.string },
  eager_global_ordinals: { schema: t.boolean },
  eager_global_ordinals_join: {},
  index_phrases: { schema: t.boolean },
  preserve_separators: { schema: t.boolean },
  preserve_position_increments: { schema: t.boolean },
  ignore_z_value: { schema: t.boolean },
  points_only: { schema: t.boolean },
  norms: { schema: t.boolean },
  norms_keyword: { schema: t.boolean },
  term_vector: { schema: t.string },
  path: { schema: t.string },
  position_increment_gap: { schema: t.number },
  index_prefixes: {
    schema: t.partial({
      min_chars: t.number,
      max_chars: t.number,
    }),
  },
  similarity: { schema: t.string },
  split_queries_on_whitespace: { schema: t.boolean },
  ignore_above: { schema: t.number },
  enable_position_increments: { schema: t.boolean },
  depth_limit: { schema: t.number },
  dims: { schema: t.string },
  relations: { schema: t.record(t.string, t.union([t.string, t.array(t.string)])) },
  max_shingle_size: { schema: t.union([t.literal(2), t.literal(3), t.literal(4)]) },
};
