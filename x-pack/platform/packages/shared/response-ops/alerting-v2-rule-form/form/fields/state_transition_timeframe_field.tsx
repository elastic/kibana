/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { getDurationUnitValue, getDurationNumberInItsUnit, getTimeOptions } from '../utils';
import type { FormValues } from '../types';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

export const StateTransitionTimeframeField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="stateTransition.pendingTimeframe"
      control={control}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.timeframeLabel', {
            defaultMessage: 'Breached for duration',
          })}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.timeframeHelpText', {
            defaultMessage:
              'How long the condition must be breached before the alert becomes active.',
          })}
          isInvalid={!!error}
          error={error?.message}
          fullWidth
        >
          <StateTransitionTimeframeInput
            value={value}
            onChange={onChange}
            errors={error?.message}
            inputRef={ref}
          />
        </EuiFormRow>
      )}
    />
  );
};

interface StateTransitionTimeframeInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  errors?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

const StateTransitionTimeframeInput: React.FC<StateTransitionTimeframeInputProps> = ({
  value,
  onChange,
  errors,
  inputRef,
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
      const raw = e.target.value.trim();
      if (raw === '') {
        onChange(undefined);
        return;
      }
      if (INTEGER_REGEX.test(raw)) {
        const parsed = parseInt(raw, 10);
        onChange(`${parsed}${intervalUnit}`);
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
    if (INVALID_KEYS.includes(e.key)) {
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
        />
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSelect
          fullWidth
          value={intervalUnit}
          options={getTimeOptions(intervalNumber ?? 1)}
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
