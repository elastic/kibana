/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeCsvCharacterSequence, type DatasetSettings } from '../../../common';
import { getSchemaResolutionDisplayLabel } from '../components/fields/schema_resolution_field';
import { getPartitionDetectionDisplayLabel } from '../components/fields/partition_detection_select';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { getFormatDisplayLabel } from '../define_step/fields/format_select';
import { getErrorModeDisplayLabel } from '../options_step/all_types/fields/error_mode_select';
import { getDelimiterDisplayLabel } from '../options_step/csv_tsv/fields/delimiter_select';
import { getHeaderRowDisplayLabel } from '../options_step/csv_tsv/fields/header_row';
import { getQuoteModeDisplayLabel } from '../options_step/csv_tsv/fields/quote_mode';
import { getTrimSpacesDisplayLabel } from '../options_step/csv_tsv/fields/trim_spaces';

type SettingKey = keyof DatasetSettings;
type SettingValue = NonNullable<DatasetSettings[SettingKey]>;

/**
 * Whether the value was set by the user (`custom`) or is an option the wizard preselects and
 * the user left untouched (`default`). Every setting in the request was set by the user.
 */
export type ReviewItemOrigin = 'custom' | 'default';

export interface ReviewItem {
  key: string;
  label: string;
  value: string;
  origin?: ReviewItemOrigin;
}

/** The wizard steps the review groups its rows by. */
export type ReviewStep = 'dataset' | 'additional' | 'mapping';

/**
 * Labels for the settings the review lists, grouped by the step that sets them and in the
 * order the form asks for them. Settings without a label are kept in the request but
 * intentionally left out of the review.
 */
const settingLabelsByStep = {
  dataset: [{ key: 'format', label: createDatasetWizardStrings.settingsFormatLabel }],
  additional: [
    { key: 'delimiter', label: createDatasetWizardStrings.settingsDelimiterLabel },
    { key: 'mode', label: createDatasetWizardStrings.settingsModeLabel },
    { key: 'header_row', label: createDatasetWizardStrings.settingsHeaderRowLabel },
    { key: 'skip_rows', label: createDatasetWizardStrings.settingsSkipRowsLabel },
    { key: 'datetime_format', label: createDatasetWizardStrings.settingsDatetimeFormatLabel },
    { key: 'null_value', label: createDatasetWizardStrings.settingsNullValueLabel },
    { key: 'encoding', label: createDatasetWizardStrings.settingsEncodingLabel },
    { key: 'quote', label: createDatasetWizardStrings.settingsQuoteLabel },
    { key: 'escape', label: createDatasetWizardStrings.settingsEscapeLabel },
    { key: 'column_prefix', label: createDatasetWizardStrings.settingsColumnPrefixLabel },
    { key: 'trim_spaces', label: createDatasetWizardStrings.settingsTrimSpacesLabel },
    { key: 'file_exclusions', label: createDatasetWizardStrings.settingsFileExclusionsLabel },
    {
      key: 'partition_detection',
      label: createDatasetWizardStrings.settingsPartitionDetectionLabel,
    },
    { key: 'partition_path', label: createDatasetWizardStrings.settingsPartitionPathLabel },
    { key: 'error_mode', label: createDatasetWizardStrings.settingsErrorModeLabel },
    { key: 'max_errors', label: createDatasetWizardStrings.settingsMaxErrorsLabel },
    { key: 'max_error_ratio', label: createDatasetWizardStrings.settingsMaxErrorRatioLabel },
  ],
  mapping: [
    { key: 'schema_resolution', label: createDatasetWizardStrings.settingsSchemaResolutionLabel },
  ],
} satisfies Record<ReviewStep, ReadonlyArray<{ key: SettingKey; label: string }>>;

/** Values read the same as the option picked in the form. */
const valueLabelGetters: Partial<Record<SettingKey, (value: string) => string>> = {
  format: getFormatDisplayLabel,
  delimiter: getDelimiterDisplayLabel,
  mode: getQuoteModeDisplayLabel,
  partition_detection: getPartitionDetectionDisplayLabel,
  error_mode: getErrorModeDisplayLabel,
  schema_resolution: getSchemaResolutionDisplayLabel,
};

/** Boolean settings read the same as the option picked in the form. */
const booleanLabelGetters: Partial<Record<SettingKey, (value: boolean) => string>> = {
  header_row: getHeaderRowDisplayLabel,
  trim_spaces: getTrimSpacesDisplayLabel,
};

const formatBoolean = (key: SettingKey, value: boolean): string =>
  booleanLabelGetters[key]?.(value) ??
  (value ? createDatasetWizardStrings.enabledLabel : createDatasetWizardStrings.disabledLabel);

const CONTROL_CHARACTER_SEQUENCES: Readonly<Record<string, string>> = {
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
};

/** Shows the characters themselves rather than their effect, so a tab reads `\t` and spaces stay visible. */
const formatText = (value: string): string => {
  const escaped = value.replace(/[\t\n\r]/g, (character) => CONTROL_CHARACTER_SEQUENCES[character]);
  return escaped.trim() === escaped ? escaped : `"${escaped}"`;
};

const CSV_CHARACTER_KEYS: readonly SettingKey[] = ['delimiter', 'quote', 'escape'];

const formatString = (key: SettingKey, value: string): string => {
  const character = CSV_CHARACTER_KEYS.includes(key) ? decodeCsvCharacterSequence(value) : value;
  const label = valueLabelGetters[key]?.(character) ?? character;
  return label === character ? formatText(character) : label;
};

const formatValue = (key: SettingKey, value: SettingValue): string => {
  if (typeof value === 'boolean') return formatBoolean(key, value);
  if (Array.isArray(value)) return value.map(formatText).join(', ');
  if (typeof value === 'string') return formatString(key, value);
  return String(value);
};

/**
 * Review rows for the labeled settings the request payload carries, grouped by step.
 * Settings left unset are omitted, since Elasticsearch decides them.
 */
export const getSettingsReviewItems = (
  settings: DatasetSettings | undefined
): Record<ReviewStep, ReviewItem[]> => {
  const applied = settings ?? {};
  const toItems = (labels: ReadonlyArray<{ key: SettingKey; label: string }>) =>
    labels.flatMap<ReviewItem>(({ key, label }) => {
      const value = applied[key];
      if (value === undefined) return [];
      return [
        {
          key,
          label,
          value: formatValue(key, value),
          // Format is a required choice, so it is neither a default nor an override.
          ...(key === 'format' ? {} : { origin: 'custom' as const }),
        },
      ];
    });

  return {
    dataset: toItems(settingLabelsByStep.dataset),
    additional: toItems(settingLabelsByStep.additional),
    mapping: toItems(settingLabelsByStep.mapping),
  };
};
