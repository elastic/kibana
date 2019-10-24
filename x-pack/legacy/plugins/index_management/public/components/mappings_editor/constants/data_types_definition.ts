/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MainType, DataType, DataTypeDefinition } from '../types';

export const TYPE_DEFINITION: { [key in DataType]: DataTypeDefinition } = {
  text: {
    value: 'text',
    label: 'Text',
    docUri: '/text.html',
  },
  keyword: {
    value: 'keyword',
    label: 'Keyword',
    docUri: '/keyword.html',
  },
  numeric: {
    value: 'numeric',
    label: 'Numeric',
    docUri: '/number.html',
    subTypes: {
      label: 'Numeric type',
      types: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'],
    },
  },
  byte: {
    label: 'Byte',
    value: 'byte',
  },
  double: {
    label: 'Double',
    value: 'double',
  },
  integer: {
    label: 'Integer',
    value: 'integer',
  },
  long: {
    label: 'Long',
    value: 'long',
  },
  float: {
    label: 'Float',
    value: 'float',
  },
  half_float: {
    label: 'Half float',
    value: 'half_float',
  },
  scaled_float: {
    label: 'Scaled float',
    value: 'scaled_float',
  },
  short: {
    label: 'Short',
    value: 'short',
  },
  date_type: {
    label: 'Date type',
    value: 'date',
    subTypes: {
      label: 'Date type',
      types: ['date', 'date_nanos'],
    },
  },
  date: {
    label: 'Date',
    value: 'date',
    docUri: '/date.html',
  },
  date_nanos: {
    label: 'Date nanos',
    value: 'date_nanos',
    docUri: '/date_nanos.html',
  },
  binary: {
    label: 'Binary',
    value: 'binary',
    docUri: '/binary.html',
  },
  ip: {
    label: 'IP',
    value: 'ip',
    docUri: '/ip.html',
  },
  boolean: {
    label: 'Boolean',
    value: 'boolean',
    docUri: '/boolean.html',
  },
  range: {
    label: 'Range',
    value: 'range',
    docUri: '/range.html',
    subTypes: {
      label: 'Range type',
      types: ['integer_range', 'float_range', 'long_range', 'double_range', 'date_range'],
    },
  },
  object: {
    label: 'Object',
    value: 'object',
    docUri: '/object.html',
  },
  nested: {
    label: 'Nested',
    value: 'nested',
    docUri: '/nested.html',
  },
  rank_feature: {
    label: 'Rank feature',
    value: 'rank_feature',
    docUri: '/rank-feature.html',
  },
  rank_features: {
    label: 'Rank features',
    value: 'date',
    docUri: '/rank-features.html',
  },
  dense_vector: {
    label: 'Dense vector',
    value: 'dense_vector',
    docUri: '/dense-vector.html',
  },
  sparse_vector: {
    label: 'Sparse vector',
    value: 'sparse_vector',
    docUri: '/sparse-vector.html',
  },
  date_range: {
    label: 'Date range',
    value: 'date_range',
  },
  double_range: {
    label: 'Double range',
    value: 'double_range',
  },
  float_range: {
    label: 'Float range',
    value: 'float_range',
  },
  integer_range: {
    label: 'Integer range',
    value: 'integer_range',
  },
  long_range: {
    label: 'Long range',
    value: 'long_range',
  },
  geo: {
    label: 'Geo',
    value: 'geo',
    subTypes: {
      label: 'Geo type',
      types: ['geo_point', 'geo_shape'],
    },
  },
  geo_point: {
    label: 'Geo point',
    value: 'geo_point',
    docUri: '/geo-point.html',
  },
  geo_shape: {
    label: 'Geo shape',
    value: 'geo_shape',
    docUri: '/geo-shape.html',
  },
  specialised: {
    label: 'Specialised',
    value: 'specialised',
    subTypes: {
      label: 'Specialised type',
      types: [
        'alias',
        'completion',
        'dense_vector',
        'flattened',
        'ip',
        'join',
        'percolator',
        'rank_feature',
        'rank_features',
        'shape',
        'search_as_you_type',
        'sparse_vector',
        'token_count',
      ],
    },
  },
  completion: {
    label: 'Completion suggester',
    value: 'completion',
    docUri: '/search-suggesters.html#completion-suggester',
  },
  token_count: {
    label: 'Token count',
    value: 'token_count',
    docUri: '/token-count.html',
  },
  percolator: {
    label: 'Percolator',
    value: 'percolator',
    docUri: '/percolator.html',
  },
  join: {
    label: 'Join',
    value: 'join',
    docUri: '/join.html',
  },
  alias: {
    label: 'Alias',
    value: 'alias',
    docUri: '/alias.html',
  },
  search_as_you_type: {
    label: 'Search as you type',
    value: 'search_as_you_type',
    docUri: '/search-as-you-type.html',
  },
  flattened: {
    label: 'Flattened',
    value: 'flattened',
    docUri: '/flattened.html',
  },
  shape: {
    label: 'Shape',
    value: 'shape',
    docUri: '/shape.html',
  },
};

export const MAIN_TYPES: MainType[] = [
  'text',
  'keyword',
  'numeric',
  'boolean',
  'date_type',
  'binary',
  'geo',
  'range',
  'object',
  'nested',
  'specialised',
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
