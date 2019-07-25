/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParameterName } from './parameters_definition';

export type DataType = 'text' | 'keyword' | 'numeric' | 'object' | 'nested' | 'array';

export type SubType = NumericType;

export type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float';

export interface DataTypeDefinition {
  label: string;
  subTypes?: { label: string; types: SubType[] };
  configuration?: ParameterName[];
  basicParameters?: ParameterName[] | ParameterName[][];
  hasAdvancedParameters?: boolean;
  hasMultiFields?: boolean;
}

export const dataTypesDefinition: { [key in DataType]: DataTypeDefinition } = {
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

const subTypesMapToType = Object.entries(dataTypesDefinition).reduce(
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

export const getTypeFromSubType = (subType: SubType): DataType =>
  subTypesMapToType[subType] as DataType;
