/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

type TrimSpacesOption = EuiComboBoxOptionOption<string> & { value: 'true' | 'false' };

const OPTIONS: TrimSpacesOption[] = [
  { value: 'true', label: createDatasetWizardStrings.trueLabel },
  {
    value: 'false',
    label: createDatasetWizardStrings.falseLabel,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
];

export function TrimSpaces({
  value,
  onChange,
  onBlur,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  onBlur: () => void;
}) {
  const selectedOptions = value
    ? [
        {
          value: 'true',
          label: createDatasetWizardStrings.trueLabel,
        },
      ]
    : [];

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
        onChange(next?.value === 'true');
      }}
      onBlur={onBlur}
    />
  );
}
