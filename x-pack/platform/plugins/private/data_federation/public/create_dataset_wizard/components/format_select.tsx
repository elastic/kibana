/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiText, EuiTextColor, type EuiSuperSelectOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { DatasetFormatFormValue } from '../create_dataset_form_state';
import { DescribedOptionDisplay } from './described_option_display';

export const SUPPORTED_DATASET_FORMATS = ['csv', 'tsv', 'ndjson', 'parquet'] as const;
export type SupportedDatasetFormat = (typeof SUPPORTED_DATASET_FORMATS)[number];

const formatOptionDisplay = ({
  title,
  description,
  testSubj,
}: {
  title: string;
  description: string;
  testSubj: string;
}) => <DescribedOptionDisplay title={title} description={description} testSubj={testSubj} />;

const formatOptionSelectedDisplay = ({
  title,
  testSubj,
  suffix,
}: {
  title: string;
  testSubj: string;
  suffix?: string;
}) => (
  <div data-test-subj={testSubj}>
    <EuiText size="s">
      <span>{title}</span>
      {suffix ? (
        <>
          {' '}
          <EuiTextColor color="subdued">{suffix}</EuiTextColor>
        </>
      ) : null}
    </EuiText>
  </div>
);

const FORMAT_OPTION_DEFS: Array<{
  value: DatasetFormatFormValue;
  title: string;
  description: string;
}> = [
  {
    value: 'csv',
    title: createDatasetWizardStrings.settingsFormatCsv,
    description: createDatasetWizardStrings.settingsFormatCsvDescription,
  },
  {
    value: 'tsv',
    title: createDatasetWizardStrings.settingsFormatTsv,
    description: createDatasetWizardStrings.settingsFormatTsvDescription,
  },
  {
    value: 'ndjson',
    title: createDatasetWizardStrings.settingsFormatNdjson,
    description: createDatasetWizardStrings.settingsFormatNdjsonDescription,
  },
  {
    value: 'parquet',
    title: createDatasetWizardStrings.settingsFormatParquet,
    description: createDatasetWizardStrings.settingsFormatParquetDescription,
  },
  /* ORC is currently disabled but will be supported in the future.
  {
    value: 'orc',
    inputDisplay: formatOptionSelectedDisplay({
      title: createDatasetWizardStrings.settingsFormatOrc,
      testSubj: 'createDatasetSettingsFormatInput-orc',
    }),
    dropdownDisplay: formatOptionDisplay({
      title: createDatasetWizardStrings.settingsFormatOrc,
      description: createDatasetWizardStrings.settingsFormatOrcDescription,
      testSubj: 'createDatasetSettingsFormatDropdown-orc',
    }),
    'data-test-subj': 'createDatasetSettingsFormatOption-orc',
  },
  */
];

export function FormatSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
  isAutoDetected = false,
}: {
  value: DatasetFormatFormValue;
  onChange: (value: DatasetFormatFormValue) => void;
  onBlur: () => void;
  isInvalid: boolean;
  isAutoDetected?: boolean;
}) {
  const options: Array<EuiSuperSelectOption<DatasetFormatFormValue>> = FORMAT_OPTION_DEFS.map(
    ({ value: optionValue, title, description }) => ({
      value: optionValue,
      inputDisplay: formatOptionSelectedDisplay({
        title,
        suffix:
          isAutoDetected && optionValue === value
            ? createDatasetWizardStrings.autoDetectedSuffix
            : undefined,
        testSubj: `createDatasetSettingsFormatInput-${optionValue}`,
      }),
      dropdownDisplay: formatOptionDisplay({
        title,
        description,
        testSubj: `createDatasetSettingsFormatDropdown-${optionValue}`,
      }),
      'data-test-subj': `createDatasetSettingsFormatOption-${optionValue}`,
    })
  );

  return (
    <EuiSuperSelect
      options={options}
      data-test-subj="createDatasetSettingsFormat"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsFormatLabel}
      valueOfSelected={value || undefined}
      onChange={(nextValue) => onChange(nextValue as DatasetFormatFormValue)}
      onBlur={onBlur}
      placeholder={createDatasetWizardStrings.settingsFormatPlaceholder}
      isInvalid={isInvalid}
    />
  );
}
