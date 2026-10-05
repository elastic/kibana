/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type {
  DataSetWithName,
  DatasetSettings,
  DatasetSettingsFile,
  DatasetMappings,
} from '../../common/dataset_types';
import type { MappingEditorValue } from './mapping_step/mapping_editor';
import { emptyMappingEditorValue } from './mapping_step/mapping_editor';
import { TIMESTAMP_FIELD_ID, TIMESTAMP_LOGICAL_FIELD_NAME } from './constants';
import {
  emptyCreateDatasetSettingsFormValues,
  encodeEscapeCharacterToFormValue,
  type CreateDatasetFormValues,
  type CreateDatasetSettingsFormValues,
  type DatasetBooleanFormValue,
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

const getUnmanagedDatasetSettings = (
  settings: DataSetWithName['settings'] | undefined
): SerializableRecord => {
  if (!settings) return {};

  // Preserve settings keys we don't manage in the UI so edits don't drop them.
  // Managed keys are the form's settings keys (everything in `emptyCreateDatasetSettingsFormValues()`).
  const managedKeys = new Set(Object.keys(emptyCreateDatasetSettingsFormValues()));
  const unmanaged: SerializableRecord = {};
  for (const [key, value] of Object.entries(settings as unknown as SerializableRecord)) {
    if (!managedKeys.has(key) && value !== undefined) {
      unmanaged[key] = value;
    }
  }
  return unmanaged;
};

export const emptyDatasetFormValues = (): CreateDatasetFormValues => ({
  name: '',
  description: '',
  data_source: '',
  resource: '',
  settings: emptyCreateDatasetSettingsFormValues(),
  ui: {
    formatWasAutoDetected: false,
    additionalCommonSettingsIsOpen: true,
    additionalAdvancedSettingsIsOpen: false,
    modeIsValid: true,
    headerRowIsValid: true,
    trimSpacesIsValid: true,
    partitionDetectionIsValid: true,
    errorModeIsValid: true,
    schemaResolutionIsValid: true,
    unmanagedSettings: {},
  },
  mappings: {
    ...emptyMappingEditorValue,
    fields: [
      {
        id: TIMESTAMP_FIELD_ID,
        name: TIMESTAMP_LOGICAL_FIELD_NAME,
        path: '',
        type: 'date',
        format: '',
      },
    ],
  },
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

  const s: DatasetSettingsFile = settings;

  return {
    ...defaults,
    format: s.format ?? '',
    // Universal
    file_exclusions: s.file_exclusions ? [...s.file_exclusions] : [...defaults.file_exclusions],
    partition_detection: s.partition_detection ?? '',
    schema_resolution: s.schema_resolution ?? '',
    partition_path: s.partition_path ?? '',
    // CSV/TSV core
    delimiter: s.delimiter ?? '',
    mode: s.mode ?? '',
    header_row: boolToFormValue(s.header_row),
    skip_rows: s.skip_rows !== undefined ? String(s.skip_rows) : '',
    datetime_format: s.datetime_format ?? '',
    null_value: s.null_value ?? '',
    encoding: s.encoding ?? defaults.encoding,
    column_prefix: s.column_prefix ?? defaults.column_prefix,
    quote: s.quote ?? '',
    escape: encodeEscapeCharacterToFormValue(s.escape ?? ''),
    trim_spaces: boolToFormValue(s.trim_spaces),
    // CSV/TSV error handling
    error_mode: s.error_mode ?? '',
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
  ui: {
    formatWasAutoDetected: false,
    additionalCommonSettingsIsOpen: true,
    additionalAdvancedSettingsIsOpen: false,
    modeIsValid: true,
    headerRowIsValid: true,
    trimSpacesIsValid: true,
    partitionDetectionIsValid: true,
    errorModeIsValid: true,
    schemaResolutionIsValid: true,
    unmanagedSettings: getUnmanagedDatasetSettings(data.settings),
  },
  mappings: mappingsToEditorValue(data.mappings),
});
