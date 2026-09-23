/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import {
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from '../create_dataset_flyout/dataset_settings_visibility';

const ACTIVE_FLOW_396_COMMON_FIELDS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  readonly DatasetSettingsFieldId[]
> = {
  csv: [
    'delimiter',
    'mode',
    'header_row',
    'skip_rows',
    'datetime_format',
    'null_value',
    'encoding',
  ],
  tsv: [
    'delimiter',
    'mode',
    'header_row',
    'skip_rows',
    'datetime_format',
    'null_value',
    'encoding',
  ],
  ndjson: ['datetime_format'],
  parquet: [],
  orc: [],
};

/** Shown in Advanced for every format, before any format-specific fields. */
const ACTIVE_FLOW_396_SHARED_ADVANCED_FIELDS: readonly DatasetSettingsFieldId[] = [
  'error_mode',
  'max_errors',
  'max_error_ratio',
  'file_exclusions',
  'partition_detection',
  'partition_path',
];

const ACTIVE_FLOW_396_FORMAT_ADVANCED_FIELDS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  readonly DatasetSettingsFieldId[]
> = {
  csv: ['quote', 'escape', 'column_prefix', 'trim_spaces'],
  tsv: ['quote', 'escape', 'column_prefix', 'trim_spaces'],
  ndjson: [],
  parquet: [],
  orc: [],
};

export const getActiveFlow396CommonFields = (
  format: Exclude<DatasetFormatFormValue, ''>
): DatasetSettingsFieldId[] => [...ACTIVE_FLOW_396_COMMON_FIELDS[format]];

export const getActiveFlow396AdvancedFields = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): DatasetSettingsFieldId[] =>
  [
    ...ACTIVE_FLOW_396_SHARED_ADVANCED_FIELDS,
    ...ACTIVE_FLOW_396_FORMAT_ADVANCED_FIELDS[format],
  ].filter(
    (fieldId) =>
      isFieldVisibleForFormat(fieldId, format) && isFieldVisibleForErrorMode(fieldId, errorMode)
  );
