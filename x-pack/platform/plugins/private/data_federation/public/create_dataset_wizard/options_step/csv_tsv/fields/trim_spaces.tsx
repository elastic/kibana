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

type TrimSpacesOption = EuiComboBoxOptionOption<string> & { value: DatasetBooleanFormValue };

const OPTIONS: TrimSpacesOption[] = [
  {
    value: 'false',
    label: createDatasetWizardStrings.falseLabel,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  { value: 'true', label: createDatasetWizardStrings.trueLabel },
];

export const getTrimSpacesDisplayLabel = (value: boolean): string =>
  OPTIONS.find((option) => option.value === String(value))?.label ?? String(value);

export function TrimSpaces({
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
      placeholder={createDatasetWizardStrings.settingsTrimSpacesPlaceholder}
      options={OPTIONS}
      data-test-subj="createDatasetSettingsTrimSpaces"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsTrimSpacesLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      selectedOptions={selectedOptions}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as TrimSpacesOption | undefined;
        onChange(next?.value ?? '');
      }}
      onBlur={onBlur}
    />
  );
}
