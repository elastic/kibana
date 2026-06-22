/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DatasetErrorModeFormValue = '' | 'fail_fast' | 'skip_row' | 'null_field';

export type DatasetPartitionDetectionFormValue = '' | 'auto' | 'hive' | 'template' | 'none';

export interface CreateDatasetSettingsFormValues {
  error_mode: DatasetErrorModeFormValue;
  partition_detection: DatasetPartitionDetectionFormValue;
}

export interface CreateDatasetFormValues {
  name: string;
  description: string;
  data_source: string;
  resource: string;
  settings: CreateDatasetSettingsFormValues;
}

export const emptyCreateDatasetSettingsFormValues = (): CreateDatasetSettingsFormValues => ({
  error_mode: '',
  partition_detection: '',
});

import type { DatasetSettingsFile, DatasetSettings } from '../../common/dataset_types';

/**
 * Maps flyout form values to settings for the API payload.
 *
 * Important: the form uses empty strings to represent "unset", but the API type
 * uses `undefined`/omitted fields — this normalizes the shape.
 */
export const buildDatasetSettingsFromFormValues = (
  settings: CreateDatasetSettingsFormValues
): DatasetSettings | undefined => {
  const applied: DatasetSettingsFile = {};

  if (settings.error_mode) {
    applied.error_mode = settings.error_mode;
  }

  if (settings.partition_detection) {
    applied.partition_detection = settings.partition_detection;
  }

  return Object.keys(applied).length > 0 ? applied : undefined;
};
