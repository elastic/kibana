/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataType, ParameterName, SelectOption } from '../types';
import { INDEX_DEFAULT } from './default_values';
import { MAIN_DATA_TYPE_DEFINITION } from './data_types_definition';

export const TYPE_NOT_ALLOWED_MULTIFIELD: DataType[] = ['object', 'nested', 'alias'];

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
  similarity: [{ value: 'BM25', text: 'Okapi BM25' }, { value: 'boolean', text: 'Boolean' }],
  term_vector: [
    { value: 'no', text: 'No' },
    { value: 'yes', text: 'Yes' },
    { value: 'with_positions', text: 'With positions' },
    { value: 'with_offsets', text: 'With offsets' },
    { value: 'with_positions_offsets', text: 'With positions offsets' },
    { value: 'with_positions_payloads', text: 'With positions payloads' },
    { value: 'with_positions_offsets_payloads', text: 'With positions offsets payloads' },
  ],
};
