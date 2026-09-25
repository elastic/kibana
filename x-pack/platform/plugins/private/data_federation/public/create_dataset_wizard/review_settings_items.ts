/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSettings } from '../../common';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

type SettingKey = keyof DatasetSettings;
type SettingValue = NonNullable<DatasetSettings[SettingKey]>;

/**
 * Whether the value comes from the user (`custom`) or is the API default the user left
 * untouched (`default`). Settings without a documented default carry no origin.
 */
export type ReviewItemOrigin = 'custom' | 'default';

export interface ReviewItem {
  key: string;
  label: string;
  value: string;
  origin?: ReviewItemOrigin;
}

/** Labels for the settings the wizard can send, in the order the review lists them. */
const settingLabels = [
  { key: 'format', label: createDatasetWizardStrings.settingsFormatLabel },
  { key: 'schema_resolution', label: createDatasetWizardStrings.settingsSchemaResolutionLabel },
  { key: 'partition_detection', label: createDatasetWizardStrings.settingsPartitionDetectionLabel },
  { key: 'partition_path', label: createDatasetWizardStrings.settingsPartitionPathLabel },
  { key: 'hive_partitioning', label: createDatasetWizardStrings.settingsHivePartitioningLabel },
  { key: 'file_exclusions', label: createDatasetWizardStrings.settingsFileExclusionsLabel },
  { key: 'error_mode', label: createDatasetWizardStrings.settingsErrorModeLabel },
  { key: 'max_errors', label: createDatasetWizardStrings.settingsMaxErrorsLabel },
  { key: 'max_error_ratio', label: createDatasetWizardStrings.settingsMaxErrorRatioLabel },
  { key: 'schema_sample_size', label: createDatasetWizardStrings.settingsSchemaSampleSizeLabel },
  { key: 'datetime_format', label: createDatasetWizardStrings.settingsDatetimeFormatLabel },
  { key: 'delimiter', label: createDatasetWizardStrings.settingsDelimiterLabel },
  { key: 'mode', label: createDatasetWizardStrings.settingsModeLabel },
  { key: 'header_row', label: createDatasetWizardStrings.settingsHeaderRowLabel },
  { key: 'skip_rows', label: createDatasetWizardStrings.settingsSkipRowsLabel },
  { key: 'null_value', label: createDatasetWizardStrings.settingsNullValueLabel },
  { key: 'encoding', label: createDatasetWizardStrings.settingsEncodingLabel },
  { key: 'quote', label: createDatasetWizardStrings.settingsQuoteLabel },
  { key: 'escape', label: createDatasetWizardStrings.settingsEscapeLabel },
  { key: 'comment', label: createDatasetWizardStrings.settingsCommentLabel },
  { key: 'column_prefix', label: createDatasetWizardStrings.settingsColumnPrefixLabel },
  { key: 'trim_spaces', label: createDatasetWizardStrings.settingsTrimSpacesLabel },
  { key: 'multi_value_syntax', label: createDatasetWizardStrings.settingsMultiValueSyntaxLabel },
  { key: 'max_field_size', label: createDatasetWizardStrings.settingsMaxFieldSizeLabel },
  { key: 'optimized_reader', label: createDatasetWizardStrings.settingsOptimizedReaderLabel },
  {
    key: 'late_materialization',
    label: createDatasetWizardStrings.settingsLateMaterializationLabel,
  },
] satisfies ReadonlyArray<{ key: SettingKey; label: string }>;

const enumLabels: Partial<Record<SettingKey, Record<string, string>>> = {
  format: {
    parquet: createDatasetWizardStrings.settingsFormatParquet,
    csv: createDatasetWizardStrings.settingsFormatCsv,
    tsv: createDatasetWizardStrings.settingsFormatTsv,
    ndjson: createDatasetWizardStrings.settingsFormatNdjson,
    orc: createDatasetWizardStrings.settingsFormatOrc,
  },
  partition_detection: {
    auto: createDatasetWizardStrings.settingsPartitionDetectionAuto,
    hive: createDatasetWizardStrings.settingsPartitionDetectionHive,
    none: createDatasetWizardStrings.settingsPartitionDetectionNone,
  },
  schema_resolution: {
    first_file_wins: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWins,
    strict: createDatasetWizardStrings.settingsSchemaResolutionStrict,
    union_by_name: createDatasetWizardStrings.settingsSchemaResolutionUnionByName,
  },
  mode: {
    quoted: createDatasetWizardStrings.settingsModeQuoted,
    escaped: createDatasetWizardStrings.settingsModeEscaped,
    plain: createDatasetWizardStrings.settingsModePlain,
  },
  multi_value_syntax: {
    none: createDatasetWizardStrings.settingsMultiValueSyntaxNone,
    brackets: createDatasetWizardStrings.settingsMultiValueSyntaxBrackets,
  },
  error_mode: {
    fail_fast: createDatasetWizardStrings.settingsErrorModeFailFast,
    skip_row: createDatasetWizardStrings.settingsErrorModeSkipRow,
    null_field: createDatasetWizardStrings.settingsErrorModeNullField,
  },
};

/**
 * Settings the API applies when the wizard leaves them unset. Only settings the form
 * documents a default for are listed, so the review never claims a default we don't know.
 */
const knownDefaults: Partial<Record<SettingKey, string>> = {
  error_mode: createDatasetWizardStrings.settingsErrorModeFailFast,
};

const formatBoolean = (key: SettingKey, value: boolean): string => {
  if (key === 'header_row') {
    return value
      ? createDatasetWizardStrings.settingsHeaderRowTrue
      : createDatasetWizardStrings.settingsHeaderRowFalse;
  }
  return value ? createDatasetWizardStrings.enabledLabel : createDatasetWizardStrings.disabledLabel;
};

const formatValue = (key: SettingKey, value: SettingValue): string => {
  if (typeof value === 'boolean') return formatBoolean(key, value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return enumLabels[key]?.[value] ?? value;
  return String(value);
};

/**
 * Review rows for the "Additional settings" column: every setting the request payload
 * carries, plus the documented defaults the user left untouched.
 */
export const getSettingsReviewItems = (settings: DatasetSettings | undefined): ReviewItem[] => {
  const applied = settings ?? {};

  return settingLabels.flatMap<ReviewItem>(({ key, label }) => {
    const value = applied[key];

    if (value === undefined) {
      const defaultValue = knownDefaults[key];
      return defaultValue ? [{ key, label, value: defaultValue, origin: 'default' }] : [];
    }

    return [
      {
        key,
        label,
        value: formatValue(key, value),
        // Format is a required choice, so it is neither a default nor an override.
        ...(key === 'format' ? {} : { origin: 'custom' }),
      },
    ];
  });
};
