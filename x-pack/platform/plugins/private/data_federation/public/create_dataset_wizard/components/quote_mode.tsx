/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { DatasetModeFormValue } from '../create_dataset_form_state';

type QuoteModeOption = EuiComboBoxOptionOption<string> & { value: DatasetModeFormValue };

const OPTIONS: QuoteModeOption[] = [
  {
    value: 'quoted',
    label: createDatasetWizardStrings.settingsModeQuoted,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  { value: 'escaped', label: createDatasetWizardStrings.settingsModeEscaped },
  { value: 'plain', label: createDatasetWizardStrings.settingsModePlain },
];

export function QuoteMode({
  value,
  onChange,
  onBlur,
}: {
  value: DatasetModeFormValue;
  onChange: (next: DatasetModeFormValue) => void;
  onBlur: () => void;
}) {
  const selectedOptions = useMemo(() => {
    if (!value) return [];
    const option = OPTIONS.find((o) => o.value === value);
    return option
      ? ([
          {
            value: option.value,
            label: option.label,
          },
        ] as QuoteModeOption[])
      : ([{ value, label: value } as QuoteModeOption] as QuoteModeOption[]);
  }, [value]);

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsModePlaceholder}
      options={OPTIONS}
      data-test-subj="createDatasetSettingsMode"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsModeLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      selectedOptions={selectedOptions}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as QuoteModeOption | undefined;
        onChange(next?.value ?? '');
      }}
      onBlur={onBlur}
    />
  );
}
