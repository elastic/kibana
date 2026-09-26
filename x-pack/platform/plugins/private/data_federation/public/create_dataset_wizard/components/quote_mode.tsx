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

type QuoteModeOption = EuiComboBoxOptionOption<string> & {
  value: DatasetModeFormValue;
  'data-test-subj': string;
};

const OPTIONS: QuoteModeOption[] = [
  {
    value: 'quoted',
    label: createDatasetWizardStrings.settingsModeQuoted,
    'data-test-subj': 'createDatasetSettingsModeOption-quoted',
  },
  {
    value: 'escaped',
    label: createDatasetWizardStrings.settingsModeEscaped,
    'data-test-subj': 'createDatasetSettingsModeOption-escaped',
  },
  {
    value: 'plain',
    label: createDatasetWizardStrings.settingsModePlain,
    'data-test-subj': 'createDatasetSettingsModeOption-plain',
  },
];

export function QuoteMode({
  value,
  onChange,
  onBlur,
  defaultValue,
}: {
  value: DatasetModeFormValue;
  onChange: (next: DatasetModeFormValue) => void;
  onBlur: () => void;
  /** Format-specific default: quoted for CSV, plain for TSV. */
  defaultValue?: DatasetModeFormValue;
}) {
  const options = useMemo(
    (): QuoteModeOption[] =>
      OPTIONS.map((option) => ({
        ...option,
        append:
          defaultValue && option.value === defaultValue ? (
            <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
          ) : undefined,
      })),
    [defaultValue]
  );

  const selectedOptions = useMemo(() => {
    if (!value) return [];
    const option = options.find((o) => o.value === value);
    return option
      ? ([
          {
            value: option.value,
            label: option.label,
          },
        ] as QuoteModeOption[])
      : ([{ value, label: value } as QuoteModeOption] as QuoteModeOption[]);
  }, [options, value]);

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsModePlaceholder}
      options={options}
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
