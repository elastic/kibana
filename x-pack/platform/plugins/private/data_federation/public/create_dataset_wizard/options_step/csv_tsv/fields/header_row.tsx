/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';
import { DescribedOptionDisplay } from '../../../components/described_option_display';

type HeaderRowOption = EuiComboBoxOptionOption<string> & {
  value: DatasetBooleanFormValue;
  description: string;
  'data-test-subj': string;
};

const renderHeaderRowOption = (option: EuiComboBoxOptionOption<string>) => {
  const opt = option as HeaderRowOption;
  return <DescribedOptionDisplay title={opt.label} description={opt.description} />;
};

const OPTIONS: HeaderRowOption[] = [
  {
    value: 'true',
    label: createDatasetWizardStrings.trueLabel,
    description: createDatasetWizardStrings.settingsHeaderRowTrueDescription,
    'data-test-subj': 'createDatasetSettingsHeaderRowOption-true',
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  {
    value: 'false',
    label: createDatasetWizardStrings.falseLabel,
    description: createDatasetWizardStrings.settingsHeaderRowFalseDescription,
    'data-test-subj': 'createDatasetSettingsHeaderRowOption-false',
  },
];

export function HeaderRow({
  value,
  onChange,
  onBlur,
}: {
  value: DatasetBooleanFormValue;
  onChange: (next: DatasetBooleanFormValue) => void;
  onBlur: () => void;
}) {
  const selectedOptions = useMemo(() => {
    const option = OPTIONS.find((o) => o.value === value);
    return option ? [{ value: option.value, label: option.label }] : [];
  }, [value]);

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsHeaderRowPlaceholder}
      options={OPTIONS}
      data-test-subj="createDatasetSettingsHeaderRow"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsHeaderRowLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      rowHeight="auto"
      renderOption={renderHeaderRowOption}
      selectedOptions={selectedOptions}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as HeaderRowOption | undefined;
        onChange(next?.value ?? '');
      }}
      onBlur={onBlur}
    />
  );
}
