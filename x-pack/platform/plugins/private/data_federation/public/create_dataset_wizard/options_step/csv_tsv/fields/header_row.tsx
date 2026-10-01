/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
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

export interface HeaderRowChange {
  value: DatasetBooleanFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

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
  isInvalid,
}: {
  value: DatasetBooleanFormValue;
  onChange: (next: HeaderRowChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

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
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as HeaderRowOption | undefined;
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
    />
  );
}
