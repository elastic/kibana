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
  DatasetMappings,
} from '../../common/dataset_types';
import type { MappingEditorValue } from '../components/mapping_editor';
import { emptyMappingEditorValue } from '../components/mapping_editor';
import {
  emptyCreateDatasetSettingsFormValues,
  DEFAULT_COLUMN_PREFIX,
  DEFAULT_ENCODING,
  DEFAULT_FILE_EXCLUSIONS,
  type CreateDatasetFormValues,
  type CreateDatasetSettingsFormValues,
  type DatasetBooleanFormValue,
  type DatasetErrorModeFormValue,
  type DatasetFormatFormValue,
  type DatasetModeFormValue,
  type DatasetMultiValueSyntaxFormValue,
  type DatasetPartitionDetectionFormValue,
  type DatasetSchemaResolutionFormValue,
} from './create_dataset_form_state';

const mappingsToEditorValue = (mappings: DatasetMappings | undefined): MappingEditorValue => {
  if (!mappings) return { ...emptyMappingEditorValue };

  const fields = Object.entries(mappings.properties ?? {}).map(([name, prop], idx) => ({
    id: String(idx),
    name,
    path: prop.path ?? '',
    type: prop.type,
    format: prop.format ?? '',
  }));

  return {
    dynamic: mappings.dynamic !== 'false',
    fields,
  };
};

export const emptyDatasetFormValues = (): CreateDatasetFormValues => ({
  name: '',
  description: '',
  data_source: '',
  resource: '',
  settings: emptyCreateDatasetSettingsFormValues(),
  mappings: { ...emptyMappingEditorValue },
});

/** Maps a list-table row to form initial state (no extra GET). */
export const dataSetFromListItem = (item: DataSetWithName): DataSetWithName => ({
  ...item,
  description: item.description ?? '',
});

const boolToFormValue = (value: boolean | undefined): DatasetBooleanFormValue => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
};

const settingsToFormValues = (
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
    file_exclusions: s.file_exclusions ? [...s.file_exclusions] : [...DEFAULT_FILE_EXCLUSIONS],
    partition_detection: (s.partition_detection ?? '') as DatasetPartitionDetectionFormValue,
    schema_resolution: (s.schema_resolution ?? '') as DatasetSchemaResolutionFormValue,
    partition_path: s.partition_path ?? '',
    hive_partitioning: boolToFormValue(s.hive_partitioning),
    optimized_reader: boolToFormValue(s.optimized_reader),
    late_materialization: boolToFormValue(s.late_materialization),
    // CSV/TSV + NDJSON
    schema_sample_size: s.schema_sample_size !== undefined ? String(s.schema_sample_size) : '',
    // CSV/TSV core
    delimiter: s.delimiter ?? '',
    mode: (s.mode ?? '') as DatasetModeFormValue,
    header_row: boolToFormValue(s.header_row),
    skip_rows: s.skip_rows !== undefined ? String(s.skip_rows) : '',
    datetime_format: s.datetime_format ?? '',
    null_value: s.null_value ?? '',
    encoding: s.encoding ?? DEFAULT_ENCODING,
    column_prefix: s.column_prefix ?? DEFAULT_COLUMN_PREFIX,
    quote: s.quote ?? '',
    escape: s.escape ?? '',
    comment: s.comment ?? '',
    trim_spaces: s.trim_spaces ?? false,
    multi_value_syntax: (s.multi_value_syntax ?? '') as DatasetMultiValueSyntaxFormValue,
    max_field_size: s.max_field_size !== undefined ? String(s.max_field_size) : '',
    // CSV/TSV error handling
    error_mode: (s.error_mode ?? '') as DatasetErrorModeFormValue,
    max_errors: s.max_errors !== undefined ? String(s.max_errors) : '',
    max_error_ratio: s.max_error_ratio !== undefined ? String(s.max_error_ratio) : '',
    // API-only fields (segment_size) are not in the form.
  };
};

export const dataSetToFormValues = (data: DataSetWithName): CreateDatasetFormValues => ({
  name: data.name,
  description: data.description ?? '',
  data_source: data.data_source,
  resource: data.resource,
  settings: settingsToFormValues(data.settings),
  mappings: mappingsToEditorValue(data.mappings),
});
