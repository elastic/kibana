/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetModeFormValue } from '../../../create_dataset_form_state';
import { DescribedOptionDisplay } from '../../../components/described_option_display';

type QuoteModeOption = EuiComboBoxOptionOption<string> & {
  value: DatasetModeFormValue;
  description: string;
  'data-test-subj': string;
};

const renderQuoteModeOption = (option: EuiComboBoxOptionOption<string>) => {
  const opt = option as QuoteModeOption;
  return <DescribedOptionDisplay title={opt.label} description={opt.description} />;
};

export interface QuoteModeChange {
  value: DatasetModeFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

const OPTIONS: QuoteModeOption[] = [
  {
    value: 'quoted',
    label: createDatasetWizardStrings.settingsModeQuoted,
    description: createDatasetWizardStrings.settingsModeQuotedDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-quoted',
  },
  {
    value: 'escaped',
    label: createDatasetWizardStrings.settingsModeEscaped,
    description: createDatasetWizardStrings.settingsModeEscapedDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-escaped',
  },
  {
    value: 'plain',
    label: createDatasetWizardStrings.settingsModePlain,
    description: createDatasetWizardStrings.settingsModePlainDescription,
    'data-test-subj': 'createDatasetSettingsModeOption-plain',
  },
];

export function QuoteMode({
  value,
  onChange,
  onBlur,
  isInvalid,
  defaultValue,
}: {
  value: DatasetModeFormValue;
  onChange: (next: QuoteModeChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
  /** Format-specific default: quoted for CSV, plain for TSV. */
  defaultValue?: DatasetModeFormValue;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

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
      rowHeight="auto"
      renderOption={renderQuoteModeOption}
      selectedOptions={selectedOptions}
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as QuoteModeOption | undefined;
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
    />
  );
}
