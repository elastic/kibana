/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
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
  const { control, getValues, setValue } = useFormContext<FormValues>();

  useEffect(() => {
    const currentTimeframe = getValues('stateTransition.pendingTimeframe');
    if (currentTimeframe == null) {
      setValue('stateTransition.pendingTimeframe', '2m');
    }
  }, [getValues, setValue]);

  return (
    <Controller
      name="stateTransition.pendingTimeframe"
      control={control}
      rules={{
        required: i18n.translate(
          'xpack.alertingV2.ruleForm.stateTransition.timeframeRequiredError',
          {
            defaultMessage: 'Duration is required.',
          }
        ),
      }}
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
  const intervalNumber = useMemo(() => getDurationNumberInItsUnit(value || '2m'), [value]);

  const intervalUnit = useMemo(() => getDurationUnitValue(value || '2m'), [value]);

  const onIntervalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsedValue = parsePositiveIntegerInput(e.target.value);
      if (parsedValue != null) {
        onChange(`${parsedValue}${intervalUnit}`);
      }
    },
    [intervalUnit, onChange]
  );

  const onIntervalUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(`${intervalNumber}${e.target.value}`);
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
          value={intervalNumber}
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
          options={getTimeOptions(intervalNumber)}
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
