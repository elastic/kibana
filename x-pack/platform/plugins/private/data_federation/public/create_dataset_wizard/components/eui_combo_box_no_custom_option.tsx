/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { ComboBoxChange } from './combo_box_selection_validity';
import { DescribedOptionDisplay } from './described_option_display';

export interface EuiComboBoxNoCustomOptionOption<T extends string> {
  value: T;
  label: string;
  /** Shown beneath the label in the dropdown list. */
  description?: string;
  'data-test-subj'?: string;
}

const DEFAULT_BADGE = (
  <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
);

/** Single-selection combo box restricted to its options; an empty value means unset. */
export function EuiComboBoxNoCustomOption<T extends string>({
  value,
  onChange,
  onBlur,
  options,
  defaultValue,
  isInvalid,
  isDisabled,
  compressed,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: {
  value: T | '';
  /** Reports selections, and typed text that has not been resolved to an option as invalid. */
  onChange: (next: ComboBoxChange<T | ''>) => void;
  onBlur: () => void;
  options: ReadonlyArray<EuiComboBoxNoCustomOptionOption<T>>;
  /** Option marked with a default badge. */
  defaultValue?: T | '';
  isInvalid: boolean;
  isDisabled?: boolean;
  compressed?: boolean;
  placeholder: string;
  'aria-label': string;
  'data-test-subj': string;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const comboBoxOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<T>> =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        'data-test-subj': option['data-test-subj'],
        append: defaultValue && option.value === defaultValue ? DEFAULT_BADGE : undefined,
      })),
    [options, defaultValue]
  );

  const selectedOptions = useMemo((): Array<EuiComboBoxOptionOption<T>> => {
    const selected = options.find((option) => option.value === value);
    if (selected) return [{ value: selected.value, label: selected.label }];
    return value ? [{ value, label: value }] : [];
  }, [options, value]);

  const descriptions = useMemo(
    () =>
      new Map(
        options.flatMap(({ value: optionValue, description }) =>
          description ? [[optionValue, description] as const] : []
        )
      ),
    [options]
  );

  const renderDescribedOption = useCallback(
    ({ value: optionValue, label }: EuiComboBoxOptionOption<T>) => (
      <DescribedOptionDisplay
        title={label}
        description={(optionValue && descriptions.get(optionValue)) || ''}
      />
    ),
    [descriptions]
  );
  const hasDescriptions = descriptions.size > 0;

  return (
    <EuiComboBox<T>
      placeholder={placeholder}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      options={comboBoxOptions}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      isClearable
      fullWidth
      compressed={compressed}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      rowHeight={hasDescriptions ? 'auto' : undefined}
      renderOption={hasDescriptions ? renderDescribedOption : undefined}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        latestValue.current = nextSelectedOptions[0]?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
    />
  );
}
