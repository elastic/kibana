/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasetSettings,
  DatasetSettingsFile,
} from '../../common/dataset_types';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

/** Form value when format should be omitted from the API payload (automatic detection). */
export const DATASET_FORMAT_AUTOMATIC = '' as const;

export type DatasetFormatFormValue =
  | typeof DATASET_FORMAT_AUTOMATIC
  | 'parquet'
  | 'csv'
  | 'ndjson'
  | 'orc';

export type DatasetErrorModeFormValue = '' | 'fail_fast' | 'skip_row' | 'null_field';

export type DatasetPartitionDetectionFormValue =
  | ''
  | 'auto'
  | 'hive'
  | 'template'
  | 'none';

export interface CreateDatasetSettingsFormValues {
  format: DatasetFormatFormValue;
  errorMode: DatasetErrorModeFormValue;
  maxErrors: string;
  maxErrorRatio: string;
  partitionDetection: DatasetPartitionDetectionFormValue;
  partitionPath: string;
  hivePartitioning: boolean;
}

export interface CreateDatasetFormValues {
  name: string;
  description: string;
  data_source: string;
  resource: string;
  settings: CreateDatasetSettingsFormValues;
}

export const emptyCreateDatasetSettingsFormValues = (): CreateDatasetSettingsFormValues => ({
  format: DATASET_FORMAT_AUTOMATIC,
  errorMode: '',
  maxErrors: '',
  maxErrorRatio: '',
  partitionDetection: '',
  partitionPath: '',
  hivePartitioning: false,
});

export const isParquetDatasetFormat = (
  format: DatasetFormatFormValue
): format is 'parquet' => format === 'parquet';

export const isFileDatasetFormat = (
  format: DatasetFormatFormValue
): format is 'csv' | 'ndjson' | 'orc' =>
  format === 'csv' || format === 'ndjson' || format === 'orc';

/** File-format settings fields apply for automatic detection and explicit file formats. */
export const showsDatasetFileSettings = (format: DatasetFormatFormValue): boolean =>
  format === DATASET_FORMAT_AUTOMATIC || isFileDatasetFormat(format);

const parseOptionalPositiveInteger = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
};

const parseOptionalRatio = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    return undefined;
  }
  return parsed;
};

export const validateMaxErrorRatio = (value: string): true | string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    return createDatasetFlyoutStrings.settingsMaxErrorRatioInvalid();
  }
  return true;
};

export const validateMaxErrors = (value: string): true | string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return createDatasetFlyoutStrings.settingsMaxErrorsInvalid();
  }
  return true;
};

const applyFileSettingsFields = (
  fileSettings: DatasetSettingsFile,
  settings: CreateDatasetSettingsFormValues
): void => {
  if (settings.errorMode) {
    fileSettings.errorMode = settings.errorMode;
  }

  const maxErrors = parseOptionalPositiveInteger(settings.maxErrors);
  if (maxErrors !== undefined) {
    fileSettings.maxErrors = maxErrors;
  }

  const maxErrorRatio = parseOptionalRatio(settings.maxErrorRatio);
  if (maxErrorRatio !== undefined) {
    fileSettings.maxErrorRatio = maxErrorRatio;
  }

  if (settings.partitionDetection) {
    fileSettings.partitionDetection = settings.partitionDetection;
  }

  const partitionPath = settings.partitionPath.trim();
  if (partitionPath) {
    fileSettings.partitionPath = partitionPath;
  }

  if (settings.hivePartitioning) {
    fileSettings.hivePartitioning = true;
  }
};

const buildFileSettingsFromFormValues = (
  settings: CreateDatasetSettingsFormValues,
  includeFormat: boolean
): DatasetSettingsFile | undefined => {
  const fileSettings: DatasetSettingsFile = {};

  if (includeFormat && isFileDatasetFormat(settings.format)) {
    fileSettings.format = settings.format;
  }

  applyFileSettingsFields(fileSettings, settings);

  return Object.keys(fileSettings).length > 0 ? fileSettings : undefined;
};

/** Maps flyout form values to {@link DatasetSettings} for the API payload. */
export const buildDatasetSettingsFromFormValues = (
  settings: CreateDatasetSettingsFormValues
): DatasetSettings | undefined => {
  const { format } = settings;

  if (isParquetDatasetFormat(format)) {
    return { format: 'parquet' };
  }

  if (format === DATASET_FORMAT_AUTOMATIC) {
    return buildFileSettingsFromFormValues(settings, false);
  }

  if (isFileDatasetFormat(format)) {
    return buildFileSettingsFromFormValues(settings, true);
  }

  return undefined;
};
