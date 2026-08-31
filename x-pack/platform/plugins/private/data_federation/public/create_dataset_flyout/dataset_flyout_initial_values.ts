/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataSetWithName,
  DatasetSettings,
  DatasetSettingsFile,
} from '../../common/dataset_types';
import {
  emptyCreateDatasetSettingsFormValues,
  type CreateDatasetFormValues,
  type CreateDatasetSettingsFormValues,
  type DatasetBooleanFormValue,
  type DatasetErrorModeFormValue,
  type DatasetFormatFormValue,
  type DatasetModeFormValue,
  type DatasetMultiValueSyntaxFormValue,
  type DatasetPartitionDetectionFormValue,
  type DatasetSchemaResolutionFormValue,
} from './create_dataset_flyout_form_state';
import { mapNullValueToForm } from './dataset_settings_options';

export const emptyDatasetFlyoutFormValues = (): CreateDatasetFormValues => ({
  name: '',
  description: '',
  data_source: '',
  resource: '',
  settings: emptyCreateDatasetSettingsFormValues(),
});

/** Maps a list-table row to flyout initial state (no extra GET). */
export const dataSetFromListItem = (item: DataSetWithName): DataSetWithName => ({
  ...item,
  description: item.description ?? '',
});

const boolToFormValue = (value: boolean | undefined): DatasetBooleanFormValue => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
};

/**
 * Datasets stored before partition_detection replaced hive_partitioning carry
 * only the old toggle, so read it as the equivalent detection mode.
 */
const partitionDetectionFromSettings = (
  settings: DatasetSettingsFile
): DatasetPartitionDetectionFormValue => {
  if (settings.partition_detection) {
    return settings.partition_detection;
  }

  if (settings.hive_partitioning === true) return 'hive';
  if (settings.hive_partitioning === false) return 'none';

  return '';
};

const settingsToFlyoutFormValues = (
  settings: DatasetSettings | undefined
): CreateDatasetSettingsFormValues => {
  const defaults = emptyCreateDatasetSettingsFormValues();
  if (!settings) {
    return defaults;
  }

  const s = settings as DatasetSettingsFile;

  return {
    ...defaults,
    format: (s.format ?? '') as DatasetFormatFormValue,
    // Universal
    partition_detection: partitionDetectionFromSettings(s),
    schema_resolution: (s.schema_resolution ?? '') as DatasetSchemaResolutionFormValue,
    partition_path: s.partition_path ?? '',
    // CSV/TSV + NDJSON
    schema_sample_size: s.schema_sample_size !== undefined ? String(s.schema_sample_size) : '',
    // CSV/TSV core
    delimiter: s.delimiter ?? '',
    mode: (s.mode ?? '') as DatasetModeFormValue,
    header_row: boolToFormValue(s.header_row),
    // CSV/TSV advanced
    null_value: mapNullValueToForm(s.null_value),
    encoding: s.encoding ?? '',
    quote: s.quote ?? '',
    escape: s.escape ?? '',
    comment: s.comment ?? '',
    column_prefix: s.column_prefix ?? '',
    datetime_format: s.datetime_format ?? '',
    multi_value_syntax: (s.multi_value_syntax ?? '') as DatasetMultiValueSyntaxFormValue,
    max_field_size: s.max_field_size !== undefined ? String(s.max_field_size) : '',
    // CSV/TSV error handling
    error_mode: (s.error_mode ?? '') as DatasetErrorModeFormValue,
    max_errors: s.max_errors !== undefined ? String(s.max_errors) : '',
    max_error_ratio: s.max_error_ratio !== undefined ? String(s.max_error_ratio) : '',
    segment_size: s.segment_size ?? '',
    optimized_reader: boolToFormValue(s.optimized_reader),
    late_materialization: boolToFormValue(s.late_materialization),
  };
};

export const dataSetToFlyoutFormValues = (data: DataSetWithName): CreateDatasetFormValues => ({
  name: data.name,
  description: data.description ?? '',
  data_source: data.data_source,
  resource: data.resource,
  settings: settingsToFlyoutFormValues(data.settings),
});
