/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MainType, SubType, DataType, DataTypeDefinition } from '../types';

export const TYPE_DEFINITION: { [key in DataType]: boolean } = {
  text: true,
  keyword: true,
  numeric: true,
  byte: true,
  double: true,
  integer: true,
  long: true,
  float: true,
  half_float: true,
  scaled_float: true,
  short: true,
  date: true,
  date_nanos: true,
  binary: true,
  ip: true,
  boolean: true,
  range: true,
  object: true,
  nested: true,
  rank_feature: true,
  rank_features: true,
  dense_vector: true,
  date_range: true,
  double_range: true,
  float_range: true,
  integer_range: true,
  long_range: true,
  ip_range: true,
  geo_point: true,
  geo_shape: true,
  completion: true,
  token_count: true,
  percolator: true,
  join: true,
  alias: true,
  search_as_you_type: true,
  flattened: true,
  shape: true,
};

export const MAIN_TYPES: MainType[] = [
  'alias',
  'binary',
  'boolean',
  'completion',
  'date',
  'date_nanos',
  'dense_vector',
  'flattened',
  'geo_point',
  'geo_shape',
  'ip',
  'join',
  'keyword',
  'nested',
  'numeric',
  'object',
  'percolator',
  'range',
  'rank_feature',
  'rank_features',
  'search_as_you_type',
  'shape',
  'text',
  'token_count',
];

export const MAIN_DATA_TYPE_DEFINITION: {
  [key in MainType]: DataTypeDefinition;
} = MAIN_TYPES.reduce(
  (acc, type) => ({
    ...acc,
    [type]: TYPE_DEFINITION[type],
  }),
  {} as { [key in MainType]: DataTypeDefinition }
);

/**
 * Return a map of subType -> mainType
 *
 * @example
 *
 * {
 *   long: 'numeric',
 *   integer: 'numeric',
 *   short: 'numeric',
 * }
 */
export const SUB_TYPE_MAP_TO_MAIN = Object.entries(MAIN_DATA_TYPE_DEFINITION).reduce(
  (acc, [type, definition]) => {
    if ({}.hasOwnProperty.call(definition, 'subTypes')) {
      definition.subTypes!.types.forEach(subType => {
        acc[subType] = type;
      });
    }
    return acc;
  },
  {} as Record<SubType, string>
);

// Single source of truth of all the possible data types.
export const ALL_DATA_TYPES = [
  ...Object.keys(MAIN_DATA_TYPE_DEFINITION),
  ...Object.keys(SUB_TYPE_MAP_TO_MAIN),
];
