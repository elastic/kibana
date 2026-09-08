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
  SCHEMA_SAMPLE_SIZE_MAX,
  SCHEMA_SAMPLE_SIZE_MIN,
  validatePartitionPath,
} from './create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import { datasetWizardStrings } from '../create_dataset_wizard/dataset_wizard_i18n';
import { getDefaultSettingsForFormat } from './dataset_settings_defaults';
import type { DatasetSettings } from '../../common/dataset_types';
import {
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS,
  mergeCustomJsonIntoDatasetSettings,
  stripJsonComments,
  validateSettingsCustomJson,
  type DatasetSettingsCustomJsonApiKey,
} from './settings_custom_json_utils';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { isFieldVisibleForErrorMode, isFieldVisibleForFormat } from './dataset_settings_visibility';

export const DATASET_SETTINGS_CUSTOM_JSON_SCHEMA_URI =
  'kibana://data-federation/dataset-settings-custom-json';

const CUSTOM_JSON_API_ONLY_KEYS = new Set<DatasetSettingsCustomJsonApiKey>(['target_split_size']);

const isDatasetSettingsFieldId = (
  key: DatasetSettingsCustomJsonApiKey
): key is DatasetSettingsFieldId => !CUSTOM_JSON_API_ONLY_KEYS.has(key);

const getCustomJsonPropertyLabel = (fieldId: DatasetSettingsCustomJsonApiKey): string => {
  switch (fieldId) {
    case 'partition_detection':
      return createDatasetFlyoutStrings.settingsPartitionDetectionLabel();
    case 'schema_resolution':
      return createDatasetFlyoutStrings.settingsSchemaResolutionLabel();
    case 'partition_path':
      return createDatasetFlyoutStrings.settingsPartitionPathLabel();
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

const CUSTOM_JSON_PROPERTY_SCHEMAS: Record<DatasetSettingsCustomJsonApiKey, JSONSchema7Definition> =
  {
    partition_detection: {
      type: 'string',
      enum: ['auto', 'hive', 'template', 'none'],
    },
    schema_resolution: {
      type: 'string',
      enum: ['first_file_wins', 'strict', 'union_by_name'],
    },
    partition_path: {
      type: 'string',
    },
    schema_sample_size: {
      type: 'integer',
      minimum: SCHEMA_SAMPLE_SIZE_MIN,
      maximum: SCHEMA_SAMPLE_SIZE_MAX,
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

    return isFieldVisibleForFormat(key, format) && isFieldVisibleForErrorMode(key, errorMode);
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

const isJsonSchemaObject = (
  definition: JSONSchema7Definition | undefined
): definition is JSONSchema7 => typeof definition === 'object' && definition !== null;

const validateCustomJsonPropertyValue = (
  key: string,
  value: unknown,
  definition: JSONSchema7
): true | string => {
  if (definition.type === 'string') {
    if (typeof value !== 'string') {
      return datasetWizardStrings.settingsCustomJsonInvalidTypeErrorMessage(key, 'string');
    }

    if (definition.enum && !definition.enum.includes(value)) {
      return datasetWizardStrings.settingsCustomJsonInvalidEnumErrorMessage(
        key,
        definition.enum.map(String).join(', ')
      );
    }

    return true;
  }

  if (definition.type === 'boolean') {
    return typeof value === 'boolean'
      ? true
      : datasetWizardStrings.settingsCustomJsonInvalidTypeErrorMessage(key, 'boolean');
  }

  if (definition.type === 'integer' || definition.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return datasetWizardStrings.settingsCustomJsonInvalidTypeErrorMessage(
        key,
        definition.type === 'integer' ? 'integer' : 'number'
      );
    }

    if (definition.type === 'integer' && !Number.isInteger(value)) {
      return datasetWizardStrings.settingsCustomJsonInvalidTypeErrorMessage(key, 'integer');
    }

    if (definition.minimum !== undefined && value < definition.minimum) {
      return datasetWizardStrings.settingsCustomJsonInvalidMinimumErrorMessage(
        key,
        definition.minimum
      );
    }

    if (definition.maximum !== undefined && value > definition.maximum) {
      return datasetWizardStrings.settingsCustomJsonInvalidMaximumErrorMessage(
        key,
        definition.maximum
      );
    }

    return true;
  }

  return true;
};

const validateCustomJsonObject = (
  parsed: Record<string, unknown>,
  format: DatasetFormatFormValue,
  errorMode: DatasetErrorModeFormValue
): true | string => {
  const knownKeys = new Set<string>(DATASET_SETTINGS_CUSTOM_JSON_API_KEYS);
  const visibleKeys =
    format === '' ? knownKeys : new Set(getVisibleCustomJsonApiKeys(format, errorMode));
  const propertySchemas =
    format === ''
      ? CUSTOM_JSON_PROPERTY_SCHEMAS
      : getDatasetSettingsCustomJsonSchema(format, errorMode).properties ?? {};

  for (const [key, value] of Object.entries(parsed)) {
    if (!knownKeys.has(key)) {
      return datasetWizardStrings.settingsCustomJsonUnknownPropertyErrorMessage(key);
    }

    if (!visibleKeys.has(key)) {
      return datasetWizardStrings.settingsCustomJsonUnsupportedForFormatErrorMessage(key);
    }

    const definition = isJsonSchemaObject(propertySchemas[key])
      ? propertySchemas[key]
      : CUSTOM_JSON_PROPERTY_SCHEMAS[key as DatasetSettingsCustomJsonApiKey];

    if (!isJsonSchemaObject(definition)) {
      continue;
    }

    const propertyResult = validateCustomJsonPropertyValue(key, value, definition);
    if (propertyResult !== true) {
      return propertyResult;
    }
  }

  return true;
};

/**
 * Syntax, types, and partition-path pairing for custom settings JSON, so Next
 * cannot send a payload Elasticsearch or the Kibana schema would reject.
 */
export const validateDatasetSettingsCustomJson = (
  value: string,
  formValues?: { settings: CreateDatasetSettingsFormValues }
): true | string => {
  const syntaxResult = validateSettingsCustomJson(value);
  if (syntaxResult !== true) {
    return syntaxResult;
  }

  const stripped = stripJsonComments(value?.trim() ?? '');
  if (!stripped || stripped === '{}') {
    return true;
  }

  const parsed = JSON.parse(stripped) as Record<string, unknown>;
  const format = formValues?.settings.format ?? '';
  const errorMode = formValues?.settings.error_mode ?? '';
  const objectResult = validateCustomJsonObject(parsed, format, errorMode);
  if (objectResult !== true) {
    return objectResult;
  }

  if (!formValues) {
    return true;
  }

  const merged = mergeCustomJsonIntoDatasetSettings(
    buildDatasetSettingsFromFormValues(formValues.settings),
    value
  );
  const partitionPath = merged?.partition_path ?? '';

  // Template with an empty path is filled at submit; only a leftover path
  // under another detection mode is rejected here.
  if (!partitionPath.trim()) {
    return true;
  }

  return validatePartitionPath(partitionPath, merged?.partition_detection ?? '');
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
