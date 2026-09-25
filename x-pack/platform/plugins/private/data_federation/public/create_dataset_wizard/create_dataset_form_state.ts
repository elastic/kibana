/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSettings, DatasetSettingsFile } from '../../common/dataset_types';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { MappingEditorValue } from '../components/mapping_editor';

export type DatasetFormatFormValue = '' | 'parquet' | 'csv' | 'tsv' | 'ndjson' | 'orc';
export type DatasetErrorModeFormValue = '' | 'fail_fast' | 'skip_row' | 'null_field';
export type DatasetModeFormValue = '' | 'quoted' | 'escaped' | 'plain';
export type DatasetPartitionDetectionFormValue = '' | 'auto' | 'hive' | 'template' | 'none';
export type DatasetSchemaResolutionFormValue = '' | 'first_file_wins' | 'strict' | 'union_by_name';
export type DatasetBooleanFormValue = '' | 'true' | 'false';

export const DEFAULT_FILE_EXCLUSIONS = [
  '**/_*',
  '**/.*',
  '**/_temporary/**',
  '**/_delta_log/**',
] as const;

export const DEFAULT_ENCODING = 'UTF-8';
export const DEFAULT_DATETIME_FORMAT = 'ISO8601';
export const DEFAULT_DATETIME_FORMAT_LABEL = 'ISO-8601';
export const DEFAULT_COLUMN_PREFIX = 'col';
export const DEFAULT_CSV_QUOTE = '"';
export const DEFAULT_CSV_ESCAPE = '\\';

export interface CreateDatasetSettingsFormValues {
  format: DatasetFormatFormValue;
  // Universal
  file_exclusions: string[];
  partition_detection: DatasetPartitionDetectionFormValue;
  schema_resolution: DatasetSchemaResolutionFormValue;
  partition_path: string;
  hive_partitioning: DatasetBooleanFormValue;
  // Parquet advanced
  optimized_reader: DatasetBooleanFormValue;
  late_materialization: DatasetBooleanFormValue;
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
  trim_spaces: boolean;
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
  };
  mappings: MappingEditorValue;
}

export const emptyCreateDatasetSettingsFormValues = (): CreateDatasetSettingsFormValues => ({
  format: '',
  file_exclusions: [],
  partition_detection: '',
  schema_resolution: '',
  partition_path: '',
  hive_partitioning: '',
  optimized_reader: '',
  late_materialization: '',
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
  trim_spaces: false,
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

export const validateMaxErrors = (value: string): true | string => {
  if (!value?.trim()) return true;
  const parsed = parseNonNegativeInteger(value);
  if (parsed === undefined) return createDatasetWizardStrings.settingsMaxErrorsInvalid;
  return true;
};

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
  if (value.length !== 1) return createDatasetWizardStrings.settingsDelimiterInvalid;
  return true;
};

export const validateSkipRows = (value: string): true | string => {
  if (!value?.trim()) return true;
  if (parseSkipRows(value) === undefined) return createDatasetWizardStrings.settingsSkipRowsInvalid;
  return true;
};

const validateSingleCharacter = (value: string, errorMessage: string): true | string => {
  if (!value) return true;
  if (value.length !== 1) return errorMessage;
  return true;
};

export const validateQuoteCharacter = (value: string): true | string =>
  validateSingleCharacter(value, createDatasetWizardStrings.settingsQuoteInvalid);

export const validateEscapeCharacter = (value: string): true | string =>
  validateSingleCharacter(value, createDatasetWizardStrings.settingsEscapeInvalid);

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
  if (settings.partition_path) applied.partition_path = settings.partition_path;
  const hivePartitioning = parseBooleanFormValue(settings.hive_partitioning);
  if (hivePartitioning !== undefined) applied.hive_partitioning = hivePartitioning;

  if (settings.error_mode) applied.error_mode = settings.error_mode;
  const maxErrors = parseNonNegativeInteger(settings.max_errors);
  if (maxErrors !== undefined) applied.max_errors = maxErrors;
  const maxErrorRatio = parseRatio(settings.max_error_ratio);
  if (maxErrorRatio !== undefined) applied.max_error_ratio = maxErrorRatio;

  const { format } = settings;
  const isCsvTsv = format === 'csv' || format === 'tsv';
  const isNdjson = format === 'ndjson';
  const isParquet = format === 'parquet';

  if (isCsvTsv) {
    if (settings.delimiter) applied.delimiter = settings.delimiter;
    if (settings.mode) applied.mode = settings.mode;

    const headerRow = parseBooleanFormValue(settings.header_row);
    if (headerRow !== undefined) applied.header_row = headerRow;

    const skipRows = parseSkipRows(settings.skip_rows);
    if (skipRows !== undefined) applied.skip_rows = skipRows;

    if (settings.null_value) applied.null_value = settings.null_value;
    if (settings.encoding && settings.encoding !== DEFAULT_ENCODING) {
      applied.encoding = settings.encoding;
    }
    if (format === 'csv') {
      if (settings.quote && settings.quote !== DEFAULT_CSV_QUOTE) {
        applied.quote = settings.quote;
      }
      if (settings.escape && settings.escape !== DEFAULT_CSV_ESCAPE) {
        applied.escape = settings.escape;
      }
    } else {
      if (settings.quote) applied.quote = settings.quote;
      if (settings.escape) applied.escape = settings.escape;
    }
    if (settings.column_prefix && settings.column_prefix !== DEFAULT_COLUMN_PREFIX) {
      applied.column_prefix = settings.column_prefix;
    }
    if (settings.trim_spaces) applied.trim_spaces = true;
  }

  if (isParquet) {
    const optimizedReader = parseBooleanFormValue(settings.optimized_reader);
    if (optimizedReader !== undefined) applied.optimized_reader = optimizedReader;
    const lateMaterialization = parseBooleanFormValue(settings.late_materialization);
    if (lateMaterialization !== undefined) applied.late_materialization = lateMaterialization;
  }

  if (isCsvTsv || isNdjson) {
    if (settings.datetime_format && settings.datetime_format !== DEFAULT_DATETIME_FORMAT) {
      applied.datetime_format = settings.datetime_format;
    }
  }

  return Object.keys(applied).length > 0 ? applied : undefined;
};
