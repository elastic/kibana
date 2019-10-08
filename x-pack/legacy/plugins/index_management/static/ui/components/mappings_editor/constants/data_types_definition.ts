/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MainType, DataTypeDefinition } from '../types';

export const DATA_TYPE_DEFINITION: { [key in MainType]: DataTypeDefinition } = {
  text: {
    label: 'Text',
    basicParameters: ['store', 'index', 'fielddata'],
  },
  keyword: {
    label: 'Keyword',
    basicParameters: ['store', 'index', 'doc_values'],
  },
  numeric: {
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
    basicParameters: ['doc_values', 'store'],
  },
  ip: {
    label: 'IP',
    basicParameters: [['store', 'index', 'doc_values'], ['null_value', 'boost']],
  },
  boolean: {
    label: 'Boolean',
    basicParameters: [['store', 'index', 'doc_values'], ['null_value', 'boost']],
  },
  range: {
    label: 'Range',
    subTypes: {
      label: 'Range type',
      types: ['integer_range', 'float_range', 'long_range', 'double_range', 'date_range'],
    },
    basicParameters: [['store', 'index', 'coerce', 'doc_values'], ['boost']],
  },
  object: {
    label: 'Object',
    basicParameters: ['dynamic', 'enabled'],
  },
  nested: {
    label: 'Nested',
    basicParameters: ['dynamic'],
  },
  rank_feature: {
    label: 'Rank feature',
  },
  rank_features: {
    label: 'Rank features',
  },
  dense_vector: {
    label: 'Dense vector',
  },
  sparse_vector: {
    label: 'Sparse vector',
  },
};
