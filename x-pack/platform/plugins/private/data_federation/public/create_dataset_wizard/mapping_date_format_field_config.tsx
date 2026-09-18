/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  getSettingDefaultLiteral,
  getSettingDefaultValue,
} from '../create_dataset_flyout/dataset_settings_default_hints';
import { DATETIME_FORMAT_PRESETS } from '../create_dataset_flyout/dataset_settings_options';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import { datasetWizardStrings } from './dataset_wizard_i18n';

const FORMAT_VALUES: Exclude<DatasetFormatFormValue, ''>[] = [
  'csv',
  'tsv',
  'parquet',
  'ndjson',
  'orc',
];

const isKnownFormat = (value: DatasetFormatFormValue): value is Exclude<DatasetFormatFormValue, ''> =>
  value !== '' && FORMAT_VALUES.includes(value as Exclude<DatasetFormatFormValue, ''>);

const getDefaultPresetValue = (format: DatasetFormatFormValue): string => {
  if (!isKnownFormat(format)) {
    return 'ISO-8601';
  }

  return getSettingDefaultValue('datetime_format' as DatasetSettingsFieldId, format) ?? 'ISO-8601';
};

const getDefaultPresetLiteral = (format: DatasetFormatFormValue): string => {
  if (!isKnownFormat(format)) {
    return 'ISO-8601';
  }

  return getSettingDefaultLiteral('datetime_format' as DatasetSettingsFieldId, format) ?? 'ISO-8601';
};

export interface MappingDateFormatFieldConfig {
  label: string;
  placeholder: string;
  presets: ReturnType<typeof DATETIME_FORMAT_PRESETS>;
  defaultPresetValue?: string;
  defaultPresetLiteral?: string;
}

export const getMappingDateFormatFieldConfig = (
  format: DatasetFormatFormValue
): MappingDateFormatFieldConfig => ({
  label: datasetWizardStrings.timestampMappingFormatLabel(),
  placeholder: datasetWizardStrings.timestampMappingFormatPlaceholder(),
  presets: DATETIME_FORMAT_PRESETS(),
  defaultPresetValue: getDefaultPresetValue(format),
  defaultPresetLiteral: getDefaultPresetLiteral(format),
});

export const getMappingDateFormatFieldHelpText = ({
  defaultPresetLiteral,
}: Pick<MappingDateFormatFieldConfig, 'defaultPresetLiteral'>): React.ReactNode =>
  defaultPresetLiteral ? (
    <FormattedMessage
      id="xpack.dataFederation.createDatasetFlyout.settingsDefaultHelp"
      defaultMessage="{value} by default."
      values={{ value: <EuiCode>{defaultPresetLiteral}</EuiCode> }}
    />
  ) : undefined;
