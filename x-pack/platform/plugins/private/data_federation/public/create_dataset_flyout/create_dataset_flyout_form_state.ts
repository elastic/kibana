/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSettings, DatasetSettingsFile } from '../../common/dataset_types';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

export type DatasetFormatFormValue = '' | 'parquet' | 'csv' | 'tsv' | 'ndjson' | 'orc';
export type DatasetErrorModeFormValue = '' | 'fail_fast' | 'skip_row' | 'null_field';
export type DatasetModeFormValue = '' | 'quoted' | 'escaped' | 'plain';
export type DatasetMultiValueSyntaxFormValue = '' | 'none' | 'brackets';
export type DatasetPartitionDetectionFormValue = '' | 'auto' | 'hive' | 'none';
export type DatasetSchemaResolutionFormValue = '' | 'first_file_wins' | 'strict' | 'union_by_name';
export type DatasetBooleanFormValue = '' | 'true' | 'false';

export interface CreateDatasetSettingsFormValues {
  format: DatasetFormatFormValue;
  // Universal
  partition_detection: DatasetPartitionDetectionFormValue;
  schema_resolution: DatasetSchemaResolutionFormValue;
  partition_path: string;
  hive_partitioning: DatasetBooleanFormValue;
  // CSV/TSV + NDJSON
  schema_sample_size: string;
  // CSV/TSV core
  delimiter: string;
  mode: DatasetModeFormValue;
  header_row: DatasetBooleanFormValue;
  // CSV/TSV advanced
  null_value: string;
  encoding: string;
  quote: string;
  escape: string;
  comment: string;
  column_prefix: string;
  datetime_format: string;
  multi_value_syntax: DatasetMultiValueSyntaxFormValue;
  max_field_size: string;
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
}

export const emptyCreateDatasetSettingsFormValues = (): CreateDatasetSettingsFormValues => ({
  format: '',
  partition_detection: '',
  schema_resolution: '',
  partition_path: '',
  hive_partitioning: '',
  schema_sample_size: '',
  delimiter: '',
  mode: '',
  header_row: '',
  null_value: '',
  encoding: '',
  quote: '',
  escape: '',
  comment: '',
  column_prefix: '',
  datetime_format: '',
  multi_value_syntax: '',
  max_field_size: '',
  error_mode: '',
  max_errors: '',
  max_error_ratio: '',
});

const parseOptionalPositiveInteger = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
};

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

export const validateSchemaSampleSize = (value: string): true | string => {
  const parsed = parseOptionalPositiveInteger(value);
  if (value?.trim() && parsed === undefined) {
    return createDatasetFlyoutStrings.settingsSchemaSampleSizeInvalid();
  }
  return true;
};

export const validateMaxErrors = (value: string): true | string => {
  if (!value?.trim()) return true;
  const parsed = parseNonNegativeInteger(value);
  if (parsed === undefined) return createDatasetFlyoutStrings.settingsMaxErrorsInvalid();
  return true;
};

export const validateMaxErrorRatio = (value: string): true | string => {
  if (!value?.trim()) return true;
  const parsed = parseRatio(value);
  if (parsed === undefined) return createDatasetFlyoutStrings.settingsMaxErrorRatioInvalid();
  return true;
};

export const validateMaxFieldSize = (value: string): true | string => {
  if (!value?.trim()) return true;
  const parsed = parseNonNegativeInteger(value);
  if (parsed === undefined) return createDatasetFlyoutStrings.settingsMaxFieldSizeInvalid();
  return true;
};

/**
 * Maps flyout form values to settings for the API payload.
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
  if (settings.partition_detection) applied.partition_detection = settings.partition_detection;
  if (settings.schema_resolution) applied.schema_resolution = settings.schema_resolution;
  if (settings.partition_path) applied.partition_path = settings.partition_path;
  const hivePartitioning = parseBooleanFormValue(settings.hive_partitioning);
  if (hivePartitioning !== undefined) applied.hive_partitioning = hivePartitioning;

  const { format } = settings;
  const isCsvTsv = format === 'csv' || format === 'tsv';
  const isNdjson = format === 'ndjson';

  if (isCsvTsv) {
    if (settings.delimiter) applied.delimiter = settings.delimiter;
    if (settings.mode) applied.mode = settings.mode;

    const headerRow = parseBooleanFormValue(settings.header_row);
    if (headerRow !== undefined) applied.header_row = headerRow;

    if (settings.null_value) applied.null_value = settings.null_value;
    if (settings.encoding) applied.encoding = settings.encoding;
    if (settings.quote) applied.quote = settings.quote;
    if (settings.escape) applied.escape = settings.escape;
    if (settings.comment) applied.comment = settings.comment;
    if (settings.column_prefix) applied.column_prefix = settings.column_prefix;
    if (settings.multi_value_syntax) applied.multi_value_syntax = settings.multi_value_syntax;
    if (settings.error_mode) applied.error_mode = settings.error_mode;

    const maxErrors = parseNonNegativeInteger(settings.max_errors);
    if (maxErrors !== undefined) applied.max_errors = maxErrors;

    const maxErrorRatio = parseRatio(settings.max_error_ratio);
    if (maxErrorRatio !== undefined) applied.max_error_ratio = maxErrorRatio;

    const maxFieldSize = parseNonNegativeInteger(settings.max_field_size);
    if (maxFieldSize !== undefined) applied.max_field_size = maxFieldSize;
  }

  if (isCsvTsv || isNdjson) {
    const schemaSampleSize = parseOptionalPositiveInteger(settings.schema_sample_size);
    if (schemaSampleSize !== undefined) applied.schema_sample_size = schemaSampleSize;

    if (settings.datetime_format) applied.datetime_format = settings.datetime_format;
  }

  return Object.keys(applied).length > 0 ? applied : undefined;
};
