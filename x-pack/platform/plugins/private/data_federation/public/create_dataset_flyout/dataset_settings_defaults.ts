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
import { NULL_VALUE_EMPTY_STRING_PRESET } from './dataset_settings_options';

const UNIVERSAL_DEFAULTS: Partial<CreateDatasetSettingsFormValues> = {
  partition_detection: 'auto',
  schema_resolution: 'union_by_name',
  hive_partitioning: 'false',
};

const CSV_TSV_DEFAULTS: Partial<CreateDatasetSettingsFormValues> = {
  encoding: 'UTF-8',
  column_prefix: 'col',
  null_value: NULL_VALUE_EMPTY_STRING_PRESET,
  schema_sample_size: '20000',
  max_error_ratio: '0.0',
  header_row: 'true',
  comment: '//',
  multi_value_syntax: 'none',
  error_mode: 'fail_fast',
  max_field_size: '10485760',
  datetime_format: 'ISO-8601',
};

const FORMAT_DEFAULTS: Partial<
  Record<Exclude<DatasetFormatFormValue, ''>, Partial<CreateDatasetSettingsFormValues>>
> = {
  csv: { ...UNIVERSAL_DEFAULTS, ...CSV_TSV_DEFAULTS, delimiter: ',', mode: 'quoted' },
  tsv: { ...UNIVERSAL_DEFAULTS, ...CSV_TSV_DEFAULTS, delimiter: '\t', mode: 'plain' },
  ndjson: {
    ...UNIVERSAL_DEFAULTS,
    schema_sample_size: '20000',
    segment_size: '4mb',
    datetime_format: 'strict_date_optional_time',
  },
  parquet: {
    ...UNIVERSAL_DEFAULTS,
    optimized_reader: 'true',
    late_materialization: 'true',
  },
  orc: { ...UNIVERSAL_DEFAULTS },
};

export const getDefaultSettingsForFormat = (
  format: Exclude<DatasetFormatFormValue, ''>
): Partial<CreateDatasetSettingsFormValues> => FORMAT_DEFAULTS[format] ?? {};

const isKnownFormat = (format: DatasetFormatFormValue): format is Exclude<DatasetFormatFormValue, ''> =>
  format !== '';

const isCsvTsvFormat = (format: Exclude<DatasetFormatFormValue, ''>): boolean =>
  format === 'csv' || format === 'tsv';

const isCsvTsvSwitch = (
  previousFormat: Exclude<DatasetFormatFormValue, ''> | undefined,
  nextFormat: Exclude<DatasetFormatFormValue, ''>
): boolean =>
  previousFormat !== undefined &&
  previousFormat !== nextFormat &&
  isCsvTsvFormat(previousFormat) &&
  isCsvTsvFormat(nextFormat);

/**
 * Reconciles settings with a selected format:
 * - clears fields that do not apply to the format
 * - applies format defaults (overwriting prior format defaults unless the user customized the value)
 * - preserves user-entered values for shared visible fields without a format default
 * - switching between CSV and TSV always applies the target format defaults
 */
export const applySettingsForFormat = (
  current: CreateDatasetSettingsFormValues,
  nextFormat: Exclude<DatasetFormatFormValue, ''>
): CreateDatasetSettingsFormValues => {
  const defaults = getDefaultSettingsForFormat(nextFormat);
  const next = { ...emptyCreateDatasetSettingsFormValues(), format: nextFormat };
  const previousFormat = isKnownFormat(current.format) ? current.format : undefined;
  const resetCsvTsvDefaults = isCsvTsvSwitch(previousFormat, nextFormat);

  for (const fieldId of DATASET_SETTINGS_FIELD_IDS) {
    if (!isFieldVisibleForFormat(fieldId, nextFormat)) {
      continue;
    }

    const previousDefaults = previousFormat ? getDefaultSettingsForFormat(previousFormat) : {};
    const currentValue = current[fieldId];
    const userCustomized =
      !resetCsvTsvDefaults &&
      previousFormat &&
      isFieldVisibleForFormat(fieldId, previousFormat) &&
      Boolean(currentValue) &&
      (!Object.prototype.hasOwnProperty.call(previousDefaults, fieldId) ||
        currentValue !== previousDefaults[fieldId as keyof typeof previousDefaults]);

    if (Object.prototype.hasOwnProperty.call(defaults, fieldId)) {
      next[fieldId] = userCustomized
        ? (currentValue as CreateDatasetSettingsFormValues[typeof fieldId])
        : (defaults[fieldId] as CreateDatasetSettingsFormValues[typeof fieldId]);
      continue;
    }

    if (userCustomized) {
      next[fieldId] = currentValue as CreateDatasetSettingsFormValues[typeof fieldId];
    }
  }

  return next;
};

/** @deprecated Use applySettingsForFormat */
export const applyFormatDefaults = applySettingsForFormat;
