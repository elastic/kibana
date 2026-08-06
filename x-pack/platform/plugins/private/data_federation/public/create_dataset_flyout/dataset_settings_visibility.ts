/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetErrorModeFormValue, DatasetFormatFormValue } from './create_dataset_flyout_form_state';

export type DatasetSettingsAccordionId =
  | 'structure'
  | 'textParsing'
  | 'columns'
  | 'errorHandling'
  | 'limits';

export type DatasetSettingsFieldId =
  | 'partition_detection'
  | 'partition_path'
  | 'schema_sample_size'
  | 'schema_resolution'
  | 'hive_partitioning'
  | 'delimiter'
  | 'mode'
  | 'quote'
  | 'escape'
  | 'comment'
  | 'encoding'
  | 'header_row'
  | 'column_prefix'
  | 'null_value'
  | 'datetime_format'
  | 'multi_value_syntax'
  | 'error_mode'
  | 'max_errors'
  | 'max_error_ratio'
  | 'max_field_size'
  | 'segment_size'
  | 'optimized_reader'
  | 'late_materialization';

const CSV_TSV: DatasetSettingsFieldId[] = [
  'partition_detection',
  'partition_path',
  'schema_sample_size',
  'schema_resolution',
  'hive_partitioning',
  'delimiter',
  'mode',
  'quote',
  'escape',
  'comment',
  'encoding',
  'header_row',
  'column_prefix',
  'null_value',
  'datetime_format',
  'multi_value_syntax',
  'error_mode',
  'max_errors',
  'max_error_ratio',
  'max_field_size',
];

const FIELD_VISIBILITY: Record<DatasetSettingsFieldId, Exclude<DatasetFormatFormValue, ''>[]> = {
  partition_detection: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  partition_path: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  schema_resolution: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  hive_partitioning: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  schema_sample_size: ['csv', 'tsv', 'ndjson'],
  delimiter: ['csv', 'tsv'],
  mode: ['csv', 'tsv'],
  quote: ['csv', 'tsv'],
  escape: ['csv', 'tsv'],
  comment: ['csv', 'tsv'],
  encoding: ['csv', 'tsv'],
  header_row: ['csv', 'tsv'],
  column_prefix: ['csv', 'tsv'],
  null_value: ['csv', 'tsv'],
  datetime_format: ['csv', 'tsv', 'ndjson'],
  multi_value_syntax: ['csv', 'tsv'],
  error_mode: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  max_errors: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  max_error_ratio: ['csv', 'tsv', 'ndjson', 'parquet', 'orc'],
  max_field_size: ['csv', 'tsv'],
  segment_size: ['ndjson'],
  optimized_reader: ['parquet'],
  late_materialization: ['parquet'],
};

const ACCORDION_FIELDS: Record<DatasetSettingsAccordionId, DatasetSettingsFieldId[]> = {
  structure: [
    'partition_detection',
    'partition_path',
    'schema_sample_size',
    'schema_resolution',
    'hive_partitioning',
  ],
  textParsing: ['mode', 'quote', 'escape', 'comment', 'encoding'],
  columns: ['header_row', 'column_prefix', 'null_value', 'multi_value_syntax'],
  errorHandling: ['error_mode', 'max_errors', 'max_error_ratio'],
  limits: ['max_field_size', 'segment_size', 'optimized_reader', 'late_materialization'],
};

const ERROR_MODE_LIMIT_FIELDS: DatasetSettingsFieldId[] = ['max_errors', 'max_error_ratio'];

export const isFieldVisibleForFormat = (
  field: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): boolean => FIELD_VISIBILITY[field].includes(format);

export const isFieldVisibleForErrorMode = (
  field: DatasetSettingsFieldId,
  errorMode: DatasetErrorModeFormValue
): boolean => {
  if (!ERROR_MODE_LIMIT_FIELDS.includes(field)) {
    return true;
  }

  return errorMode !== 'fail_fast';
};

export const getVisibleAccordionsForFormat = (
  format: Exclude<DatasetFormatFormValue, ''>
): DatasetSettingsAccordionId[] =>
  (Object.keys(ACCORDION_FIELDS) as DatasetSettingsAccordionId[]).filter((accordionId) =>
    ACCORDION_FIELDS[accordionId].some((field) => isFieldVisibleForFormat(field, format))
  );

export const getVisibleFieldsForAccordion = (
  accordionId: DatasetSettingsAccordionId,
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): DatasetSettingsFieldId[] =>
  ACCORDION_FIELDS[accordionId].filter(
    (field) =>
      isFieldVisibleForFormat(field, format) && isFieldVisibleForErrorMode(field, errorMode)
  );

export const CSV_TSV_FIELD_IDS = CSV_TSV;

export const DATASET_SETTINGS_FIELD_IDS = Object.keys(
  FIELD_VISIBILITY
) as DatasetSettingsFieldId[];
