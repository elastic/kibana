/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetErrorModeFormValue, DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import {
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from './dataset_settings_visibility';

const FLOW3_COMMON_FIELDS_BY_FORMAT: Record<
  Exclude<DatasetFormatFormValue, ''>,
  readonly DatasetSettingsFieldId[]
> = {
  csv: ['delimiter', 'mode', 'header_row', 'datetime_format', 'encoding'],
  tsv: ['delimiter', 'mode', 'header_row', 'datetime_format', 'encoding'],
  ndjson: ['datetime_format', 'error_mode', 'schema_sample_size'],
  parquet: ['partition_detection', 'error_mode', 'schema_resolution'],
  orc: ['partition_detection', 'error_mode'],
};

const FLOW3_FORMATS_WITH_ERROR_MODE_IN_COMMON: Exclude<DatasetFormatFormValue, ''>[] = [
  'ndjson',
  'parquet',
  'orc',
];

const FLOW3_ADVANCED_FIELD_ORDER: readonly DatasetSettingsFieldId[] = [
  'partition_detection',
  'partition_path',
  'schema_sample_size',
  'schema_resolution',
  'hive_partitioning',
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
  'segment_size',
  'optimized_reader',
  'late_materialization',
  'delimiter',
];

const getFlow3ConditionalCommonErrorFields = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue
): DatasetSettingsFieldId[] => {
  if (!FLOW3_FORMATS_WITH_ERROR_MODE_IN_COMMON.includes(format)) {
    return [];
  }

  if (errorMode === 'fail_fast') {
    return [];
  }

  return ['max_errors', 'max_error_ratio'];
};

export const getFlow3CommonFields = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): DatasetSettingsFieldId[] => [
  ...FLOW3_COMMON_FIELDS_BY_FORMAT[format],
  ...getFlow3ConditionalCommonErrorFields(format, errorMode),
];

export const getFlow3AdvancedFields = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): DatasetSettingsFieldId[] => {
  const commonFields = new Set(getFlow3CommonFields(format, errorMode));

  return FLOW3_ADVANCED_FIELD_ORDER.filter(
    (field) =>
      isFieldVisibleForFormat(field, format) &&
      isFieldVisibleForErrorMode(field, errorMode) &&
      !commonFields.has(field)
  );
};
