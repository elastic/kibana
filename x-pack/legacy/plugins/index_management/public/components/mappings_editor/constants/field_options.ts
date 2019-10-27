/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MainType, ParameterName, SelectOption } from '../types';
import { INDEX_DEFAULT } from './default_values';
import { MAIN_DATA_TYPE_DEFINITION } from './data_types_definition';

export const TYPE_NOT_ALLOWED_MULTIFIELD: MainType[] = ['object', 'nested'];

export const DYNAMIC_SETTING_OPTIONS = [
  { value: true, text: 'true' },
  { value: false, text: 'false' },
  { value: 'strict', text: 'strict' },
];

export const FIELD_TYPES_OPTIONS = Object.entries(MAIN_DATA_TYPE_DEFINITION).map(
  ([dataType, { label }]) => ({
    value: dataType,
    text: label,
  })
);

export const MULTIFIELD_TYPES_OPTIONS = FIELD_TYPES_OPTIONS.filter(
  option => TYPE_NOT_ALLOWED_MULTIFIELD.includes(option.value as MainType) === false
);

export const PARAMETERS_OPTIONS: { [key in ParameterName]?: SelectOption[] } = {
  index_options: [
    { value: 'docs', text: 'docs' },
    { value: 'freqs', text: 'freqs' },
    { value: 'positions', text: 'positions' },
    { value: 'offsets', text: 'offsets' },
  ],
  analyzer: [
    { value: INDEX_DEFAULT, text: 'Index default' },
    { value: 'standard', text: 'Standard' },
    { value: 'simple', text: 'Simple' },
    { value: 'whitespace', text: 'Whitespace' },
    { value: 'keyword', text: 'Keyword' },
    { value: 'pattern', text: 'Pattern' },
    { value: 'fingerprint', text: 'Fingerprint' },
  ],
};
