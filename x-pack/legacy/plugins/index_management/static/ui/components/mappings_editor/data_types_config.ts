/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParameterName } from './parameters';

export type DataType = 'text' | 'keyword' | 'object' | 'array' | 'boolean';

export interface DataTypeConfig {
  value: DataType;
  text: string;
  commonParameters?: ParameterName[];
  hasAdvancedParameters?: boolean;
  hasMultiFields?: boolean;
}

export const dataTypesConfig: DataTypeConfig[] = [
  {
    value: 'text',
    text: 'Text',
    commonParameters: ['store', 'index', 'doc_values'],
  },
  {
    value: 'keyword',
    text: 'Keyword',
    commonParameters: ['store', 'doc_values'],
  },
  {
    value: 'object',
    text: 'Object',
  },
  {
    value: 'array',
    text: 'Array',
  },
];
