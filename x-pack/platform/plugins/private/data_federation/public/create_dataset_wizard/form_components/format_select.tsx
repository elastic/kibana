/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiText, type EuiSuperSelectOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { DatasetFormatFormValue } from '../create_dataset_form_state';

const formatOptionDisplay = ({
  title,
  description,
  testSubj,
}: {
  title: string;
  description: string;
  testSubj: string;
}) => (
  <div data-test-subj={testSubj}>
    <EuiText size="s">
      <strong>{title}</strong>
    </EuiText>
    <EuiText size="s" color="subdued">
      {description}
    </EuiText>
  </div>
);

const formatOptionSelectedDisplay = ({ title, testSubj }: { title: string; testSubj: string }) => (
  <div data-test-subj={testSubj}>
    <EuiText size="s">{title}</EuiText>
  </div>
);

const FORMAT_OPTIONS = [
  {
    value: 'csv',
    inputDisplay: formatOptionSelectedDisplay({
      title: createDatasetWizardStrings.settingsFormatCsv,
      testSubj: 'createDatasetSettingsFormatInput-csv',
    }),
    dropdownDisplay: formatOptionDisplay({
      title: createDatasetWizardStrings.settingsFormatCsv,
      description: createDatasetWizardStrings.settingsFormatCsvDescription,
      testSubj: 'createDatasetSettingsFormatDropdown-csv',
    }),
    'data-test-subj': 'createDatasetSettingsFormatOption-csv',
  },
  {
    value: 'tsv',
    inputDisplay: formatOptionSelectedDisplay({
      title: createDatasetWizardStrings.settingsFormatTsv,
      testSubj: 'createDatasetSettingsFormatInput-tsv',
    }),
    dropdownDisplay: formatOptionDisplay({
      title: createDatasetWizardStrings.settingsFormatTsv,
      description: createDatasetWizardStrings.settingsFormatTsvDescription,
      testSubj: 'createDatasetSettingsFormatDropdown-tsv',
    }),
    'data-test-subj': 'createDatasetSettingsFormatOption-tsv',
  },
  {
    value: 'ndjson',
    inputDisplay: formatOptionSelectedDisplay({
      title: createDatasetWizardStrings.settingsFormatNdjson,
      testSubj: 'createDatasetSettingsFormatInput-ndjson',
    }),
    dropdownDisplay: formatOptionDisplay({
      title: createDatasetWizardStrings.settingsFormatNdjson,
      description: createDatasetWizardStrings.settingsFormatNdjsonDescription,
      testSubj: 'createDatasetSettingsFormatDropdown-ndjson',
    }),
    'data-test-subj': 'createDatasetSettingsFormatOption-ndjson',
  },
  {
    value: 'parquet',
    inputDisplay: formatOptionSelectedDisplay({
      title: createDatasetWizardStrings.settingsFormatParquet,
      testSubj: 'createDatasetSettingsFormatInput-parquet',
    }),
    dropdownDisplay: formatOptionDisplay({
      title: createDatasetWizardStrings.settingsFormatParquet,
      description: createDatasetWizardStrings.settingsFormatParquetDescription,
      testSubj: 'createDatasetSettingsFormatDropdown-parquet',
    }),
    'data-test-subj': 'createDatasetSettingsFormatOption-parquet',
  },
  // {
  //   value: 'orc',
  //   inputDisplay: formatOptionSelectedDisplay({
  //     title: createDatasetWizardStrings.settingsFormatOrc,
  //     testSubj: 'createDatasetSettingsFormatInput-orc',
  //   }),
  //   dropdownDisplay: formatOptionDisplay({
  //     title: createDatasetWizardStrings.settingsFormatOrc,
  //     description: createDatasetWizardStrings.settingsFormatOrcDescription,
  //     testSubj: 'createDatasetSettingsFormatDropdown-orc',
  //   }),
  //   'data-test-subj': 'createDatasetSettingsFormatOption-orc',
  // },
] satisfies Array<EuiSuperSelectOption<DatasetFormatFormValue>>;

export function FormatSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetFormatFormValue;
  onChange: (value: DatasetFormatFormValue) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  return (
    <EuiSuperSelect
      options={FORMAT_OPTIONS}
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
