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

/** Settings that describe how schema is inferred or resolved, shown on the schema mappings step. */
export const SCHEMA_MAPPING_SETTINGS_FIELD_IDS: readonly DatasetSettingsFieldId[] = [
  'schema_sample_size',
  'schema_resolution',
];

/** Flow 3 9.6 hides these on optional settings; schema resolution lives on the Infer schema card. */
export const FLOW_396_ADDITIONAL_SETTINGS_EXCLUDED_FIELD_IDS: readonly DatasetSettingsFieldId[] = [
  'schema_sample_size',
  'schema_resolution',
];

export interface GetSchemaMappingSettingsFieldIdsOptions {
  /** Flow 3 9.6 shows schema mapping settings for every format on the schema mappings step. */
  showForAllFormats?: boolean;
  /** Flow 3 9.6 does not expose schema sample size in the wizard. */
  omitSchemaSampleSize?: boolean;
}

export const getSchemaMappingSettingsFieldIds = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = '',
  {
    showForAllFormats = false,
    omitSchemaSampleSize = false,
  }: GetSchemaMappingSettingsFieldIdsOptions = {}
): DatasetSettingsFieldId[] =>
  SCHEMA_MAPPING_SETTINGS_FIELD_IDS.filter(
    (fieldId) =>
      !(omitSchemaSampleSize && fieldId === 'schema_sample_size') &&
      (showForAllFormats || isFieldVisibleForFormat(fieldId, format)) &&
      isFieldVisibleForErrorMode(fieldId, errorMode)
  );
