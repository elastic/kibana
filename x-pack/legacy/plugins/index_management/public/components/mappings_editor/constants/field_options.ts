/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MainType, ParameterName, SelectOption } from '../types';
import { INDEX_DEFAULT } from './default_values';
import { MAIN_DATA_TYPE_DEFINITION } from './data_types_definition';

const DATE_FORMATS = [
  { label: 'epoch_millis' },
  { label: 'epoch_second' },
  { label: 'date_optional_time', strict: true },
  { label: 'basic_date' },
  { label: 'basic_date_time' },
  { label: 'basic_date_time_no_millis' },
  { label: 'basic_ordinal_date' },
  { label: 'basic_ordinal_date_time' },
  { label: 'basic_ordinal_date_time_no_millis' },
  { label: 'basic_time' },
  { label: 'basic_time_no_millis' },
  { label: 'basic_t_time' },
  { label: 'basic_t_time_no_millis' },
  { label: 'basic_week_date', strict: true },
  { label: 'basic_week_date_time', strict: true },
  {
    label: 'basic_week_date_time_no_millis',
    strict: true,
  },
  { label: 'date', strict: true },
  { label: 'date_hour', strict: true },
  { label: 'date_hour_minute', strict: true },
  { label: 'date_hour_minute_second', strict: true },
  {
    label: 'date_hour_minute_second_fraction',
    strict: true,
  },
  {
    label: 'date_hour_minute_second_millis',
    strict: true,
  },
  { label: 'date_time', strict: true },
  { label: 'date_time_no_millis', strict: true },
  { label: 'hour', strict: true },
  { label: 'hour_minute ', strict: true },
  { label: 'hour_minute_second', strict: true },
  { label: 'hour_minute_second_fraction', strict: true },
  { label: 'hour_minute_second_millis', strict: true },
  { label: 'ordinal_date', strict: true },
  { label: 'ordinal_date_time', strict: true },
  { label: 'ordinal_date_time_no_millis', strict: true },
  { label: 'time', strict: true },
  { label: 'time_no_millis', strict: true },
  { label: 't_time', strict: true },
  { label: 't_time_no_millis', strict: true },
  { label: 'week_date', strict: true },
  { label: 'week_date_time', strict: true },
  { label: 'week_date_time_no_millis', strict: true },
  { label: 'weekyear', strict: true },
  { label: 'weekyear_week', strict: true },
  { label: 'weekyear_week_day', strict: true },
  { label: 'year', strict: true },
  { label: 'year_month', strict: true },
  { label: 'year_month_day', strict: true },
];

const STRICT_DATE_FORMAT_OPTIONS = DATE_FORMATS.filter(format => format.strict).map(
  ({ label }) => ({
    label: `strict_${label}`,
  })
);

const DATE_FORMAT_OPTIONS = DATE_FORMATS.map(({ label }) => ({ label }));

export const ALL_DATE_FORMAT_OPTIONS = [...DATE_FORMAT_OPTIONS, ...STRICT_DATE_FORMAT_OPTIONS];

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
  similarity: [{ value: 'BM25', text: 'BM25' }, { value: 'boolean', text: 'Boolean' }],
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
