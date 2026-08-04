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

/** Applies format defaults only to fields that are currently empty. */
export const applyFormatDefaults = (
  current: CreateDatasetSettingsFormValues,
  format: Exclude<DatasetFormatFormValue, ''>
): CreateDatasetSettingsFormValues => {
  const defaults = getDefaultSettingsForFormat(format);
  const next = { ...current };

  for (const [key, value] of Object.entries(defaults) as Array<
    [keyof CreateDatasetSettingsFormValues, string]
  >) {
    const currentValue = next[key];
    if (typeof currentValue === 'string' && !currentValue.trim() && value) {
      next[key] = value;
    }
  }

  return next;
};
