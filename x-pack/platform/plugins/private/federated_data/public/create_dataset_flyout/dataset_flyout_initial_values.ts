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
} from '../../common/dataset_types';
import {
  DATASET_FORMAT_AUTOMATIC,
  emptyCreateDatasetSettingsFormValues,
  isParquetDatasetFormat,
  type CreateDatasetFormValues,
  type CreateDatasetSettingsFormValues,
  type DatasetErrorModeFormValue,
  type DatasetFormatFormValue,
  type DatasetPartitionDetectionFormValue,
} from './create_dataset_flyout_form_state';

export const emptyDatasetFlyoutFormValues = (): CreateDatasetFormValues => ({
  name: '',
  description: '',
  data_source: '',
  resource: '',
  settings: emptyCreateDatasetSettingsFormValues(),
});

/** Maps a list-table row to flyout initial state (no extra GET). */
export const dataSetFromListItem = (item: DataSetWithName): DataSetWithName => ({
  ...item,
  description: item.description ?? '',
});

const settingsToFlyoutFormValues = (
  settings: DatasetSettings | undefined
): CreateDatasetSettingsFormValues => {
  const defaults = emptyCreateDatasetSettingsFormValues();
  if (!settings) {
    return defaults;
  }

  if (isParquetDatasetFormat(settings.format as DatasetFormatFormValue)) {
    return {
      ...defaults,
      format: 'parquet',
    };
  }

  const fileSettings = settings as DatasetSettingsFile;
  const format: DatasetFormatFormValue = fileSettings.format ?? DATASET_FORMAT_AUTOMATIC;

  return {
    ...defaults,
    format,
    error_mode: (fileSettings.error_mode ?? '') as DatasetErrorModeFormValue,
    max_errors: fileSettings.max_errors !== undefined ? String(fileSettings.max_errors) : '',
    max_error_ratio:
      fileSettings.max_error_ratio !== undefined ? String(fileSettings.max_error_ratio) : '',
    partition_detection: (fileSettings.partition_detection ??
      '') as DatasetPartitionDetectionFormValue,
    partition_path: fileSettings.partition_path ?? '',
    hive_partitioning: fileSettings.hive_partitioning ?? false,
  };
};

export const dataSetToFlyoutFormValues = (data: DataSetWithName): CreateDatasetFormValues => ({
  name: data.name,
  description: data.description ?? '',
  data_source: data.data_source,
  resource: data.resource,
  settings: settingsToFlyoutFormValues(data.settings),
});
