/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParameterName } from './parameters_definition';

export type DataType = 'text' | 'keyword' | 'numeric' | 'object' | 'nested' | 'array';

export interface DataTypeDefinition {
  label: string;
  configuration?: ParameterName[];
  basicParameters?: ParameterName[] | ParameterName[][];
  hasAdvancedParameters?: boolean;
  hasMultiFields?: boolean;
}

export const dataTypesDefinition: { [key in DataType]: DataTypeDefinition } = {
  text: {
    label: 'Text',
    basicParameters: ['store', 'index', 'doc_values'],
  },
  keyword: {
    label: 'Keyword',
    basicParameters: ['store', 'index', 'doc_values'],
  },
  numeric: {
    label: 'Numeric',
    basicParameters: [
      ['store', 'index', 'coerce', 'doc_values', 'ignore_malformed'],
      ['null_value', 'boost'],
    ],
  },
  object: {
    label: 'Object',
    configuration: ['dynamic', 'enabled'],
  },
  nested: {
    label: 'Nested',
    configuration: ['dynamic'],
  },
  array: {
    label: 'Array',
  },
};
