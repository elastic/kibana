/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateDatasetSettingsFormValues,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from './create_dataset_flyout_form_state';
import {
  DATASET_SETTINGS_FIELD_IDS,
  isFieldVisibleForFormat,
} from './dataset_settings_visibility';

const CSV_TSV_DEFAULTS: Partial<CreateDatasetSettingsFormValues> = {
  encoding: 'UTF-8',
  column_prefix: 'col',
  schema_sample_size: '20000',
  max_error_ratio: '0.0',
};

const FORMAT_DEFAULTS: Partial<
  Record<Exclude<DatasetFormatFormValue, ''>, Partial<CreateDatasetSettingsFormValues>>
> = {
  csv: { ...CSV_TSV_DEFAULTS, delimiter: ',' },
  tsv: { ...CSV_TSV_DEFAULTS, delimiter: '\t' },
  ndjson: { schema_sample_size: '20000' },
  parquet: {},
  orc: {},
};

export const getDefaultSettingsForFormat = (
  format: Exclude<DatasetFormatFormValue, ''>
): Partial<CreateDatasetSettingsFormValues> => FORMAT_DEFAULTS[format] ?? {};

const isKnownFormat = (format: DatasetFormatFormValue): format is Exclude<DatasetFormatFormValue, ''> =>
  format !== '';

/**
 * Reconciles settings with a selected format:
 * - clears fields that do not apply to the format
 * - applies format defaults (overwriting prior format defaults)
 * - preserves user-entered values for shared visible fields without a format default
 */
export const applySettingsForFormat = (
  current: CreateDatasetSettingsFormValues,
  nextFormat: Exclude<DatasetFormatFormValue, ''>
): CreateDatasetSettingsFormValues => {
  const defaults = getDefaultSettingsForFormat(nextFormat);
  const next = { ...emptyCreateDatasetSettingsFormValues(), format: nextFormat };
  const previousFormat = isKnownFormat(current.format) ? current.format : undefined;

  for (const fieldId of DATASET_SETTINGS_FIELD_IDS) {
    if (!isFieldVisibleForFormat(fieldId, nextFormat)) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(defaults, fieldId)) {
      next[fieldId] = defaults[fieldId] as CreateDatasetSettingsFormValues[typeof fieldId];
      continue;
    }

    if (
      previousFormat &&
      isFieldVisibleForFormat(fieldId, previousFormat) &&
      current[fieldId]
    ) {
      next[fieldId] = current[fieldId];
    }
  }

  return next;
};

/** @deprecated Use applySettingsForFormat */
export const applyFormatDefaults = applySettingsForFormat;
