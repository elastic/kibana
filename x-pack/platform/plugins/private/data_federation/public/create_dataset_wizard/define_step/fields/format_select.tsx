/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiText, EuiTextColor, type EuiSuperSelectOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import type { DatasetFormatFormValue } from '../../create_dataset_form_state';
import { DescribedOptionDisplay } from '../../components/described_option_display';

export const SUPPORTED_DATASET_FORMATS = ['csv', 'tsv', 'ndjson', 'parquet'] as const;
export type SupportedDatasetFormat = (typeof SUPPORTED_DATASET_FORMATS)[number];

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

const FORMAT_LABELS: Record<SupportedDatasetFormat, { title: string; description: string }> = {
  csv: {
    title: createDatasetWizardStrings.settingsFormatCsv,
    description: createDatasetWizardStrings.settingsFormatCsvDescription,
  },
  tsv: {
    title: createDatasetWizardStrings.settingsFormatTsv,
    description: createDatasetWizardStrings.settingsFormatTsvDescription,
  },
  ndjson: {
    title: createDatasetWizardStrings.settingsFormatNdjson,
    description: createDatasetWizardStrings.settingsFormatNdjsonDescription,
  },
  parquet: {
    title: createDatasetWizardStrings.settingsFormatParquet,
    description: createDatasetWizardStrings.settingsFormatParquetDescription,
  },
  /* ORC is currently disabled but will be supported in the future; add 'orc' to
     SUPPORTED_DATASET_FORMATS along with this entry.
  orc: {
    title: createDatasetWizardStrings.settingsFormatOrc,
    description: createDatasetWizardStrings.settingsFormatOrcDescription,
  },
  */
};

export const isSupportedDatasetFormat = (value: string): value is SupportedDatasetFormat =>
  Object.hasOwn(FORMAT_LABELS, value);

export const getFormatDisplayLabel = (value: string): string =>
  isSupportedDatasetFormat(value) ? FORMAT_LABELS[value].title : value;

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
  const options: Array<EuiSuperSelectOption<DatasetFormatFormValue>> =
    SUPPORTED_DATASET_FORMATS.map((optionValue) => {
      const { title, description } = FORMAT_LABELS[optionValue];
      return {
        value: optionValue,
        inputDisplay: formatOptionSelectedDisplay({
          title,
          suffix:
            isAutoDetected && optionValue === value
              ? createDatasetWizardStrings.autoDetectedSuffix
              : undefined,
          testSubj: `createDatasetSettingsFormatInput-${optionValue}`,
        }),
        dropdownDisplay: (
          <DescribedOptionDisplay
            title={title}
            description={description}
            testSubj={`createDatasetSettingsFormatDropdown-${optionValue}`}
          />
        ),
        'data-test-subj': `createDatasetSettingsFormatOption-${optionValue}`,
      };
    });

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
