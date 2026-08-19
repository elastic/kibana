/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
  CreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';
import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import { getDefaultSettingsForFormat } from './dataset_settings_defaults';
import type { DatasetSettings } from '../../common/dataset_types';
import {
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS,
  type DatasetSettingsCustomJsonApiKey,
} from './settings_custom_json_utils';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import {
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from './dataset_settings_visibility';

export const DATASET_SETTINGS_CUSTOM_JSON_SCHEMA_URI =
  'kibana://data-federation/dataset-settings-custom-json';

const CUSTOM_JSON_API_ONLY_KEYS = new Set<DatasetSettingsCustomJsonApiKey>(['target_split_size']);

const isDatasetSettingsFieldId = (key: DatasetSettingsCustomJsonApiKey): key is DatasetSettingsFieldId =>
  !CUSTOM_JSON_API_ONLY_KEYS.has(key);

const getCustomJsonPropertyLabel = (fieldId: DatasetSettingsCustomJsonApiKey): string => {
  switch (fieldId) {
    case 'partition_detection':
      return createDatasetFlyoutStrings.settingsPartitionDetectionLabel();
    case 'schema_resolution':
      return createDatasetFlyoutStrings.settingsSchemaResolutionLabel();
    case 'partition_path':
      return createDatasetFlyoutStrings.settingsPartitionPathLabel();
    case 'hive_partitioning':
      return createDatasetFlyoutStrings.settingsHivePartitioningLabel();
    case 'schema_sample_size':
      return createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel();
    case 'delimiter':
      return createDatasetFlyoutStrings.settingsDelimiterLabel();
    case 'mode':
      return createDatasetFlyoutStrings.settingsModeLabel();
    case 'header_row':
      return createDatasetFlyoutStrings.settingsHeaderRowLabel();
    case 'null_value':
      return createDatasetFlyoutStrings.settingsNullValueLabel();
    case 'encoding':
      return createDatasetFlyoutStrings.settingsEncodingLabel();
    case 'error_mode':
      return createDatasetFlyoutStrings.settingsErrorModeLabel();
    case 'max_errors':
      return createDatasetFlyoutStrings.settingsMaxErrorsLabel();
    case 'max_error_ratio':
      return createDatasetFlyoutStrings.settingsMaxErrorRatioLabel();
    case 'quote':
      return createDatasetFlyoutStrings.settingsQuoteLabel();
    case 'escape':
      return createDatasetFlyoutStrings.settingsEscapeLabel();
    case 'comment':
      return createDatasetFlyoutStrings.settingsCommentLabel();
    case 'column_prefix':
      return createDatasetFlyoutStrings.settingsColumnPrefixLabel();
    case 'datetime_format':
      return createDatasetFlyoutStrings.settingsDatetimeFormatLabel();
    case 'multi_value_syntax':
      return createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel();
    case 'max_field_size':
      return createDatasetFlyoutStrings.settingsMaxFieldSizeLabel();
    case 'segment_size':
      return createDatasetFlyoutStrings.settingsSegmentSizeLabel();
    case 'optimized_reader':
      return createDatasetFlyoutStrings.settingsOptimizedReaderLabel();
    case 'late_materialization':
      return createDatasetFlyoutStrings.settingsLateMaterializationLabel();
    case 'target_split_size':
      return createDatasetFlyoutStrings.settingsTargetSplitSizeLabel();
  }
};

const CUSTOM_JSON_PROPERTY_SCHEMAS: Record<
  DatasetSettingsCustomJsonApiKey,
  JSONSchema7Definition
> = {
  partition_detection: {
    type: 'string',
    enum: ['auto', 'hive', 'none'],
  },
  schema_resolution: {
    type: 'string',
    enum: ['first_file_wins', 'strict', 'union_by_name'],
  },
  partition_path: {
    type: 'string',
  },
  hive_partitioning: {
    type: 'boolean',
  },
  schema_sample_size: {
    type: 'integer',
    minimum: 1,
  },
  delimiter: {
    type: 'string',
  },
  mode: {
    type: 'string',
    enum: ['quoted', 'escaped', 'plain'],
  },
  header_row: {
    type: 'boolean',
  },
  null_value: {
    type: 'string',
  },
  encoding: {
    type: 'string',
  },
  error_mode: {
    type: 'string',
    enum: ['fail_fast', 'skip_row', 'null_field'],
  },
  max_errors: {
    type: 'integer',
    minimum: 0,
  },
  max_error_ratio: {
    type: 'number',
    minimum: 0,
    maximum: 1,
  },
  quote: {
    type: 'string',
  },
  escape: {
    type: 'string',
  },
  comment: {
    type: 'string',
  },
  column_prefix: {
    type: 'string',
  },
  datetime_format: {
    type: 'string',
  },
  multi_value_syntax: {
    type: 'string',
    enum: ['none', 'brackets'],
  },
  max_field_size: {
    type: 'integer',
    minimum: 0,
  },
  segment_size: {
    type: 'string',
  },
  optimized_reader: {
    type: 'boolean',
  },
  late_materialization: {
    type: 'boolean',
  },
  target_split_size: {
    type: 'string',
  },
};

export const getVisibleCustomJsonApiKeys = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): DatasetSettingsCustomJsonApiKey[] =>
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS.filter((key) => {
    if (CUSTOM_JSON_API_ONLY_KEYS.has(key)) {
      return true;
    }

    if (!isDatasetSettingsFieldId(key)) {
      return false;
    }

    return (
      isFieldVisibleForFormat(key, format) && isFieldVisibleForErrorMode(key, errorMode)
    );
  });

export const getDatasetSettingsCustomJsonSchema = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): JSONSchema7 => {
  const visibleKeys = getVisibleCustomJsonApiKeys(format, errorMode);

  const properties = visibleKeys.reduce<Record<string, JSONSchema7Definition>>((acc, key) => {
    acc[key] = {
      ...CUSTOM_JSON_PROPERTY_SCHEMAS[key],
      description: getCustomJsonPropertyLabel(key),
    };
    return acc;
  }, {});

  return {
    type: 'object',
    additionalProperties: false,
    properties,
  };
};

const CUSTOM_JSON_FALLBACK_DEFAULTS: Partial<Record<DatasetSettingsCustomJsonApiKey, unknown>> = {
  max_errors: 0,
};

export const buildDefaultSettingsCustomJson = (
  format: Exclude<DatasetFormatFormValue, ''>,
  errorMode: DatasetErrorModeFormValue = ''
): string => {
  const formatDefaults = getDefaultSettingsForFormat(format);
  const resolvedErrorMode = errorMode || formatDefaults.error_mode || '';

  const formValues: CreateDatasetSettingsFormValues = {
    ...emptyCreateDatasetSettingsFormValues(),
    format,
    ...formatDefaults,
    ...(resolvedErrorMode ? { error_mode: resolvedErrorMode } : {}),
  };

  const apiSettings = buildDatasetSettingsFromFormValues(formValues) ?? {};
  const visibleKeys = getVisibleCustomJsonApiKeys(format, resolvedErrorMode);

  const jsonObject = visibleKeys.reduce<Record<string, unknown>>((acc, key) => {
    const value = apiSettings[key as keyof DatasetSettings] ?? CUSTOM_JSON_FALLBACK_DEFAULTS[key];

    if (value !== undefined) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return JSON.stringify(jsonObject, null, 2);
};
