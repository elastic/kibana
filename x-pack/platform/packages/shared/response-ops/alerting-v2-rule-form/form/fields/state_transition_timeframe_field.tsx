/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import {
  getDurationUnitValue,
  getDurationNumberInItsUnit,
  getTimeOptions,
  INVALID_NUMBER_KEYS,
  parsePositiveIntegerInput,
} from '../utils';
import type { FormValues } from '../types';

interface StateTransitionTimeframeFieldProps {
  numberPrependLabel?: string;
}

export const StateTransitionTimeframeField: React.FC<StateTransitionTimeframeFieldProps> = ({
  numberPrependLabel,
}) => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="stateTransition.pendingTimeframe"
      control={control}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
        <StateTransitionTimeframeInput
          value={value}
          onChange={onChange}
          errors={error?.message}
          inputRef={ref}
          numberPrependLabel={numberPrependLabel}
        />
      )}
    />
  );
};

interface StateTransitionTimeframeInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  errors?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  numberPrependLabel?: string;
}

const StateTransitionTimeframeInput: React.FC<StateTransitionTimeframeInputProps> = ({
  value,
  onChange,
  errors,
  inputRef,
  numberPrependLabel,
}) => {
  const [draftUnit, setDraftUnit] = useState<string>('m');

  const intervalNumber = useMemo(
    () => (value ? getDurationNumberInItsUnit(value) : undefined),
    [value]
  );

  const intervalUnit = useMemo(
    () => (value ? getDurationUnitValue(value) : draftUnit),
    [value, draftUnit]
  );

  const onIntervalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      if (val === '') {
        onChange(undefined);
        return;
      }

      const parsedValue = parsePositiveIntegerInput(e.target.value);
      if (parsedValue != null) {
        onChange(`${parsedValue}${intervalUnit}`);
      }
    },
    [intervalUnit, onChange]
  );

  const onIntervalUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextUnit = e.target.value;
      setDraftUnit(nextUnit);
      if (intervalNumber != null) {
        onChange(`${intervalNumber}${nextUnit}`);
      }
    },
    [intervalNumber, onChange]
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_NUMBER_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={2}>
        <EuiFieldNumber
          fullWidth
          isInvalid={!!errors}
          value={intervalNumber ?? ''}
          onChange={onIntervalNumberChange}
          onKeyDown={onKeyDown}
          min={1}
          step={1}
          data-test-subj="stateTransitionTimeframeNumberInput"
          inputRef={inputRef}
          prepend={numberPrependLabel ? [numberPrependLabel] : undefined}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSelect
          fullWidth
          value={intervalUnit}
          options={getTimeOptions(intervalNumber ?? 2)}
          onChange={onIntervalUnitChange}
          data-test-subj="stateTransitionTimeframeUnitInput"
          aria-label={i18n.translate(
            'xpack.alertingV2.ruleForm.stateTransition.timeframeUnitLabel',
            { defaultMessage: 'Time unit' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
