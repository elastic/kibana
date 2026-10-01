/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type {
  DatasetSettings,
  DatasetSettingsFile,
  DatasetFormat,
  DatasetErrorMode,
  DatasetMode,
  DatasetPartitionDetection,
  DatasetSchemaResolution,
  DatasetBooleanString,
} from '../../common/dataset_types';
import {
  getConflictingCsvCharacterSettings,
  isValidDelimiter,
  isValidQuoteOrEscapeCharacter,
  type CsvCharacterSettingName,
} from '../../common';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { MappingEditorValue } from './mapping_step/mapping_editor';

export type DatasetFormatFormValue = '' | DatasetFormat;
export type DatasetErrorModeFormValue = '' | DatasetErrorMode;
export type DatasetModeFormValue = '' | DatasetMode;
export type DatasetPartitionDetectionFormValue = '' | DatasetPartitionDetection;
export type DatasetSchemaResolutionFormValue = '' | DatasetSchemaResolution;
export type DatasetBooleanFormValue = '' | DatasetBooleanString;

export const DEFAULT_FILE_EXCLUSIONS = [
  '**/_*',
  '**/.*',
  '**/_temporary/**',
  '**/_delta_log/**',
] as const;

export const DEFAULT_DATETIME_FORMAT = 'strict_date_optional_time';
export const DEFAULT_COLUMN_PREFIX = 'col';

const CHARACTER_TO_ESCAPE_SEQUENCE: Partial<Record<string, '\\t' | '\\n' | '\\r'>> = {
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
};

const ESCAPED_BACKSLASH_SEQUENCE = '\\\\';

/** Decodes the escaped backslash form value into the single backslash the API expects. */
const decodeEscapeCharacterFormValue = (value: string): string =>
  value === ESCAPED_BACKSLASH_SEQUENCE ? '\\' : value;

/** Encodes non-printable characters into a two-character escape sequence for the form. */
export const encodeEscapeCharacterToFormValue = (value: string): string => {
  if (!value) return '';
  return CHARACTER_TO_ESCAPE_SEQUENCE[value] ?? value;
};

export interface CreateDatasetSettingsFormValues {
  format: DatasetFormatFormValue;
  // Universal
  file_exclusions: string[];
  partition_detection: DatasetPartitionDetectionFormValue;
  schema_resolution: DatasetSchemaResolutionFormValue;
  partition_path: string;
  // CSV/TSV core
  delimiter: string;
  mode: DatasetModeFormValue;
  header_row: DatasetBooleanFormValue;
  skip_rows: string;
  datetime_format: string;
  null_value: string;
  encoding: string;
  // CSV/TSV advanced
  quote: string;
  escape: string;
  column_prefix: string;
  trim_spaces: DatasetBooleanFormValue;
  // CSV/TSV error handling
  error_mode: DatasetErrorModeFormValue;
  max_errors: string;
  max_error_ratio: string;
}

export interface CreateDatasetFormValues {
  name: string;
  description: string;
  data_source: string;
  resource: string;
  settings: CreateDatasetSettingsFormValues;
  /** UI-only state (never sent to the API). */
  ui: {
    formatWasAutoDetected: boolean;
    additionalCommonSettingsIsOpen: boolean;
    additionalAdvancedSettingsIsOpen: boolean;
    /**
     * Passthrough-only dataset settings not managed by the wizard UI.
     * Used to preserve API-supported settings on edit, and included in review/request output.
     */
    unmanagedSettings: SerializableRecord;
  };
  mappings: MappingEditorValue;
}

export const emptyCreateDatasetSettingsFormValues = (): CreateDatasetSettingsFormValues => ({
  format: '',
  file_exclusions: [],
  partition_detection: '',
  schema_resolution: '',
  partition_path: '',
  delimiter: '',
  mode: '',
  header_row: '',
  skip_rows: '',
  datetime_format: '',
  null_value: '',
  encoding: '',
  quote: '',
  escape: '',
  column_prefix: '',
  trim_spaces: '',
  error_mode: '',
  max_errors: '',
  max_error_ratio: '',
});

const parseNonNegativeInteger = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
};

const parseRatio = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) return undefined;
  return parsed;
};

const parseBooleanFormValue = (value: DatasetBooleanFormValue): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const validatePartitionPath = (
  value: string,
  formValues: CreateDatasetFormValues
): true | string => {
  if (formValues.settings.partition_detection !== 'template') return true;
  return value?.trim() ? true : createDatasetWizardStrings.settingsPartitionPathRequired;
};

export const validateMaxErrors = (value: string): true | string => {
  if (!value?.trim()) return true;
  if (parseNonNegativeInteger(value) === undefined) {
    return createDatasetWizardStrings.settingsMaxErrorsInvalid;
  }
  return true;
};

/** Whether `max_errors` / `max_error_ratio` apply; they are rejected with the default and `fail_fast` modes. */
export const errorModeAllowsBudget = (errorMode: DatasetErrorModeFormValue): boolean =>
  errorMode === 'skip_row' || errorMode === 'null_field';

export const validateMaxErrorRatio = (value: string): true | string => {
  if (!value?.trim()) return true;
  const parsed = parseRatio(value);
  if (parsed === undefined) return createDatasetWizardStrings.settingsMaxErrorRatioInvalid;
  return true;
};

const parseSkipRows = (value: string): number | undefined => {
  const parsed = parseNonNegativeInteger(value);
  if (parsed === undefined || parsed > 1000) return undefined;
  return parsed;
};

export const validateDelimiter = (value: string): true | string => {
  if (!value) return true;
  if (!isValidDelimiter(value)) return createDatasetWizardStrings.settingsDelimiterInvalid;
  return true;
};

export const validateSkipRows = (value: string): true | string => {
  if (!value?.trim()) return true;
  if (parseSkipRows(value) === undefined) return createDatasetWizardStrings.settingsSkipRowsInvalid;
  return true;
};

export const validateQuoteCharacter = (value: string): true | string => {
  if (!value) return true;
  if (!isValidQuoteOrEscapeCharacter(value)) return createDatasetWizardStrings.settingsQuoteInvalid;
  return true;
};

/** Builds a validator that fails when `name` resolves to the same character as another CSV character setting. */
export const validateDistinctCsvCharacter =
  (name: CsvCharacterSettingName) =>
  (_value: string, { settings }: CreateDatasetFormValues): true | string => {
    const { format, mode, delimiter, quote, escape } = settings;
    const conflicts = getConflictingCsvCharacterSettings({
      format,
      mode,
      delimiter,
      quote,
      escape,
    });
    if (!conflicts.includes(name)) {
      return true;
    }
    return createDatasetWizardStrings.settingsCsvCharactersNotDistinct;
  };

export const validateEscapeCharacter = (value: string): true | string => {
  if (!value) return true;
  if (!isValidQuoteOrEscapeCharacter(value))
    return createDatasetWizardStrings.settingsEscapeInvalid;
  return true;
};

/**
 * Maps form values to settings for the API payload.
 *
 * The form uses empty strings for "unset"; the API uses omitted fields.
 * Fields are filtered to only the subset valid for the chosen format so that
 * leftover values from a previously-selected format don't leak into the payload.
 */
export const buildDatasetSettingsFromFormValues = (
  settings: CreateDatasetSettingsFormValues
): DatasetSettings | undefined => {
  const applied: DatasetSettingsFile = {};

  if (settings.format) applied.format = settings.format;

  // Universal — applies under every format
  if (settings.file_exclusions.length > 0) {
    applied.file_exclusions = settings.file_exclusions;
  }
  if (settings.partition_detection) applied.partition_detection = settings.partition_detection;
  if (settings.schema_resolution) applied.schema_resolution = settings.schema_resolution;
  if (settings.partition_detection === 'template' && settings.partition_path) {
    applied.partition_path = settings.partition_path;
  }

  if (settings.error_mode) applied.error_mode = settings.error_mode;
  if (errorModeAllowsBudget(settings.error_mode)) {
    const maxErrors = parseNonNegativeInteger(settings.max_errors);
    if (maxErrors !== undefined) applied.max_errors = maxErrors;
    const maxErrorRatio = parseRatio(settings.max_error_ratio);
    if (maxErrorRatio !== undefined) applied.max_error_ratio = maxErrorRatio;
  }

  const { format } = settings;
  const isCsvTsv = format === 'csv' || format === 'tsv';
  const isNdjson = format === 'ndjson';

  if (isCsvTsv) {
    if (settings.delimiter) applied.delimiter = settings.delimiter;
    if (settings.mode) applied.mode = settings.mode;

    const headerRow = parseBooleanFormValue(settings.header_row);
    if (headerRow !== undefined) applied.header_row = headerRow;

    const skipRows = parseSkipRows(settings.skip_rows);
    if (skipRows !== undefined) applied.skip_rows = skipRows;

    if (settings.null_value) applied.null_value = settings.null_value;
    if (settings.encoding) applied.encoding = settings.encoding;
    if (settings.quote) applied.quote = settings.quote;
    const escape = decodeEscapeCharacterFormValue(settings.escape);
    if (escape) applied.escape = escape;
    if (settings.column_prefix) applied.column_prefix = settings.column_prefix;
    const trimSpaces = parseBooleanFormValue(settings.trim_spaces);
    if (trimSpaces !== undefined) applied.trim_spaces = trimSpaces;
  }

  // Parquet has no wizard-managed advanced settings.

  if (isCsvTsv || isNdjson) {
    if (settings.datetime_format) applied.datetime_format = settings.datetime_format;
  }

  return Object.keys(applied).length > 0 ? applied : undefined;
};
