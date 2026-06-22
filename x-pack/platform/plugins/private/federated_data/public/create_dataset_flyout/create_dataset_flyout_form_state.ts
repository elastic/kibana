/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSettings, DatasetSettingsFile } from '../../common/dataset_types';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

export type DatasetErrorModeFormValue = '' | 'fail_fast' | 'skip_row' | 'null_field';

export type DatasetPartitionDetectionFormValue = '' | 'auto' | 'hive' | 'template' | 'none';

export interface CreateDatasetSettingsFormValues {
  error_mode: DatasetErrorModeFormValue;
  partition_detection: DatasetPartitionDetectionFormValue;
  schema_sample_size: string;
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
  schema_sample_size: '',
});

const parseOptionalPositiveInteger = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }
  return parsed;
};

export const validateSchemaSampleSize = (value: string): true | string => {
  const parsed = parseOptionalPositiveInteger(value);
  if (value?.trim() && parsed === undefined) {
    return createDatasetFlyoutStrings.settingsSchemaSampleSizeInvalid();
  }
  return true;
};

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

  const schemaSampleSize = parseOptionalPositiveInteger(settings.schema_sample_size);
  if (schemaSampleSize !== undefined) {
    applied.schema_sample_size = schemaSampleSize;
  }

  return Object.keys(applied).length > 0 ? applied : undefined;
};
