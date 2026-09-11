/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSettings } from '../../common/dataset_types';
import { omitDatasetSettingsNotSentToEs } from '../../common';
import { datasetWizardStrings } from '../create_dataset_wizard/dataset_wizard_i18n';
import {
  buildDatasetSettingsFromFormValues,
  type CreateDatasetSettingsFormValues,
  type DatasetErrorModeFormValue,
} from './create_dataset_flyout_form_state';
import { getVisibleCustomJsonApiKeys } from './settings_custom_json_schema';

export const DATASET_SETTINGS_CUSTOM_JSON_API_KEYS = [
  'partition_detection',
  'schema_resolution',
  'partition_path',
  'schema_sample_size',
  'delimiter',
  'mode',
  'header_row',
  'null_value',
  'encoding',
  'error_mode',
  'max_errors',
  'max_error_ratio',
  'quote',
  'escape',
  'comment',
  'column_prefix',
  'datetime_format',
  'multi_value_syntax',
  'max_field_size',
  'segment_size',
  'optimized_reader',
  'late_materialization',
  'target_split_size',
] as const;

export type DatasetSettingsCustomJsonApiKey =
  (typeof DATASET_SETTINGS_CUSTOM_JSON_API_KEYS)[number];

const DATASET_SETTINGS_CUSTOM_JSON_API_KEY_SET = new Set<string>(
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS
);

const JSON_ONLY_CUSTOM_JSON_API_KEYS = new Set<string>(['target_split_size']);

const tryParseCustomJsonObject = (value: string): Record<string, unknown> | undefined => {
  const parsed = parseSettingsCustomJson(value);

  return parsed ? (parsed as Record<string, unknown>) : undefined;
};

/** Keeps custom JSON aligned with explicit form values (Flow 3 9.6). */
export const buildSettingsCustomJsonFromForm = (
  settings: CreateDatasetSettingsFormValues,
  errorMode: DatasetErrorModeFormValue,
  existingJsonStr: string
): string => {
  const format = settings.format;
  if (!format) {
    return existingJsonStr?.trim() ? existingJsonStr : EMPTY_SETTINGS_CUSTOM_JSON;
  }

  const visibleApiKeys = getVisibleCustomJsonApiKeys(format, errorMode);
  const apiSettings = buildDatasetSettingsFromFormValues(settings) ?? {};
  const existingParsed = tryParseCustomJsonObject(existingJsonStr) ?? {};
  const jsonObject: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(existingParsed)) {
    if (!DATASET_SETTINGS_CUSTOM_JSON_API_KEY_SET.has(key)) {
      jsonObject[key] = value;
    }
  }

  for (const key of visibleApiKeys) {
    if (JSON_ONLY_CUSTOM_JSON_API_KEYS.has(key)) {
      if (key in existingParsed) {
        jsonObject[key] = existingParsed[key];
      }
    } else {
      const apiValue = (apiSettings as Record<string, unknown>)[key];
      if (apiValue !== undefined) {
        jsonObject[key] = apiValue;
      }
    }
  }

  return JSON.stringify(jsonObject, null, 2);
};

export const EMPTY_SETTINGS_CUSTOM_JSON = '{\n\n}';

export const stripJsonComments = (value: string): string =>
  value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim();

export const parseSettingsCustomJson = (value: string): Partial<DatasetSettings> | undefined => {
  const stripped = stripJsonComments(value).trim();

  if (!stripped || stripped === '{}') {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    return undefined;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const filteredEntries = Object.entries(parsed as Record<string, unknown>).filter(([key]) =>
    DATASET_SETTINGS_CUSTOM_JSON_API_KEY_SET.has(key)
  );

  if (filteredEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(filteredEntries) as Partial<DatasetSettings>;
};

export const jsonValueToFormValue = (value: unknown): string => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

export const applyCustomJsonToFormSettings = (
  settings: CreateDatasetSettingsFormValues,
  customJson: string
): CreateDatasetSettingsFormValues => {
  const parsed = parseSettingsCustomJson(customJson);

  if (!parsed) {
    return settings;
  }

  const nextSettings = { ...settings };

  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'format' || key === 'target_split_size' || !(key in nextSettings)) {
      continue;
    }

    (nextSettings as Record<string, string>)[key] = jsonValueToFormValue(value);
  }

  return nextSettings;
};

export const validateSettingsCustomJson = (value: string): true | string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return true;
  }

  const stripped = stripJsonComments(trimmed);

  if (!stripped || stripped === '{}') {
    return true;
  }

  try {
    const parsed = JSON.parse(stripped);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return datasetWizardStrings.settingsCustomJsonInvalidObject();
    }

    return true;
  } catch {
    return datasetWizardStrings.settingsCustomJsonInvalidSyntax();
  }
};

export const mergeCustomJsonIntoDatasetSettings = (
  base: DatasetSettings | undefined,
  customJson: string
): DatasetSettings | undefined => {
  const parsed = parseSettingsCustomJson(customJson);

  if (!parsed) {
    return omitDatasetSettingsNotSentToEs(base);
  }

  if (!base) {
    return omitDatasetSettingsNotSentToEs(parsed as DatasetSettings);
  }

  return omitDatasetSettingsNotSentToEs({
    ...base,
    ...parsed,
  });
};
