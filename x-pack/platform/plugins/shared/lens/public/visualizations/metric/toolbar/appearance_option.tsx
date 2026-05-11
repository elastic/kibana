/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFieldText, EuiFormRow, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';

export function AppearanceOptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <EuiText size="s">
      <h4>{title}</h4>
      {children}
    </EuiText>
  );
}

export function SubtitleOption({
  value = '',
  onChange,
  isDisabled,
}: {
  value?: string;
  onChange: (subtitle: string) => void;
  isDisabled: boolean | string;
}) {
  const { inputValue, handleInputChange } = useDebouncedValue<string>(
    { onChange, value },
    { allowFalsyValue: true }
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.metric.appearancePopover.subtitle', {
        defaultMessage: 'Subtitle',
      })}
      fullWidth
      display="columnCompressed"
      isDisabled={!!isDisabled}
    >
      <EuiToolTip display="block" content={isDisabled}>
        <EuiFieldText
          compressed
          disabled={!!isDisabled}
          data-test-subj="lens-metric-appearance-subtitle-field"
          value={inputValue}
          onChange={({ target: { value: newValue } }) => handleInputChange(newValue)}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}

interface AppearanceOptionProps<OptionType extends string> {
  label: string;
  value: OptionType;
  options: Array<EuiButtonGroupOptionProps & { id: OptionType }>;
  onChange: (id: OptionType) => void;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  dataTestSubj?: string;
}

export function AppearanceOption<OptionType extends string>({
  label,
  value,
  options,
  onChange,
  isDisabled = false,
  isIconOnly = false,
  dataTestSubj,
}: AppearanceOptionProps<OptionType>) {
  const onChangeOption = (clickedOptionId: string) => {
    // Prevent onChange method call if the option clicked is selected
    if (value !== clickedOptionId) {
      onChange(clickedOptionId as OptionType);
    }
  };

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj={dataTestSubj}
        buttonSize="compressed"
        options={options}
        // Don't show selected option if the button group is disabled
        idSelected={isDisabled ? '' : value}
        isDisabled={isDisabled}
        onChange={onChangeOption}
        isIconOnly={isIconOnly}
      />
    </EuiFormRow>
  );
}
