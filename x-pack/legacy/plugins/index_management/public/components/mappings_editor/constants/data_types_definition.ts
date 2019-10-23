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
    basicParameters: ['store', 'index', 'fielddata'],
  },
  keyword: {
    value: 'keyword',
    label: 'Keyword',
    basicParameters: ['store', 'index', 'doc_values'],
  },
  numeric: {
    value: 'numeric',
    label: 'Numeric',
    subTypes: {
      label: 'Numeric type',
      types: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'],
    },
    basicParameters: [
      ['store', 'index', 'coerce', 'doc_values', 'ignore_malformed'],
      ['null_value', 'boost'],
    ],
  },
  date: {
    label: 'Date',
    value: 'date',
    subTypes: {
      label: 'Date type',
      types: ['date', 'date_nanos'],
    },
    basicParameters: [
      ['store', 'index', 'doc_values', 'ignore_malformed'],
      ['null_value', 'boost', 'locale', 'format'],
    ],
  },
  binary: {
    label: 'Binary',
    value: 'binary',
    basicParameters: ['doc_values', 'store'],
  },
  ip: {
    label: 'IP',
    value: 'ip',
    basicParameters: [['store', 'index', 'doc_values'], ['null_value', 'boost']],
  },
  boolean: {
    label: 'Boolean',
    value: 'boolean',
    basicParameters: [['store', 'index', 'doc_values'], ['null_value', 'boost']],
  },
  range: {
    label: 'Range',
    value: 'range',
    subTypes: {
      label: 'Range type',
      types: ['integer_range', 'float_range', 'long_range', 'double_range', 'date_range'],
    },
    basicParameters: [['store', 'index', 'coerce', 'doc_values'], ['boost']],
  },
  object: {
    label: 'Object',
    value: 'object',
    basicParameters: ['dynamic', 'enabled'],
  },
  nested: {
    label: 'Nested',
    value: 'nested',
    basicParameters: ['dynamic'],
  },
  rank_feature: {
    label: 'Rank feature',
    value: 'rank_feature',
  },
  rank_features: {
    label: 'Rank features',
    value: 'date',
  },
  dense_vector: {
    label: 'Dense vector',
    value: 'dense_vector',
  },
  sparse_vector: {
    label: 'Sparse vector',
    value: 'sparse_vector',
  },
  byte: {
    label: 'Byte',
    value: 'byte',
  },
  date_nanos: {
    label: 'Date nanos',
    value: 'date_nanos',
  },
  date_range: {
    label: 'Date range',
    value: 'date_range',
  },
  double: {
    label: 'Double',
    value: 'double',
  },
  double_range: {
    label: 'Double range',
    value: 'double_range',
  },
  float: {
    label: 'Float',
    value: 'float',
  },
  float_range: {
    label: 'Float range',
    value: 'float_range',
  },
  half_float: {
    label: 'Half float',
    value: 'half_float',
  },
  integer: {
    label: 'Integer',
    value: 'integer',
  },
  integer_range: {
    label: 'Integer range',
    value: 'integer_range',
  },
  long: {
    label: 'Long',
    value: 'long',
  },
  long_range: {
    label: 'Long range',
    value: 'long_range',
  },
  scaled_float: {
    label: 'Scaled float',
    value: 'scaled_float',
  },
  short: {
    label: 'Short',
    value: 'short',
  },
};

export const MAIN_TYPES: MainType[] = [
  'text',
  'keyword',
  'numeric',
  'date',
  'binary',
  'ip',
  'boolean',
  'range',
  'object',
  'nested',
  'rank_feature',
  'rank_features',
  'dense_vector',
  'sparse_vector',
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
