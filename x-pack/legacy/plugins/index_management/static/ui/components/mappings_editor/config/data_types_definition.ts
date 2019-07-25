/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParameterName } from './parameters_definition';

export type DataType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'date'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'array';

export type SubType = NumericType | DateType | RangeType;

export type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float';

export type DateType = 'date' | 'date_nanos';

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'double_range'
  | 'date_range';

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
