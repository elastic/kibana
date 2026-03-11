/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { MAX_CONSECUTIVE_BREACHES } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { INVALID_NUMBER_KEYS, parsePositiveIntegerInput } from '../utils';
const DEFAULT_COUNT = 2;

export type StateTransitionCountVariant = 'pending' | 'recovering';

interface StateTransitionCountFieldProps {
  prependLabel?: string;
  /** Which state transition field to bind to. Defaults to 'pending'. */
  variant?: StateTransitionCountVariant;
}

const FIELD_NAMES: Record<
  StateTransitionCountVariant,
  'stateTransition.pendingCount' | 'stateTransition.recoveringCount'
> = {
  pending: 'stateTransition.pendingCount',
  recovering: 'stateTransition.recoveringCount',
};

const TEST_SUBJS: Record<StateTransitionCountVariant, string> = {
  pending: 'stateTransitionCountInput',
  recovering: 'recoveryTransitionCountInput',
};

export const StateTransitionCountField: React.FC<StateTransitionCountFieldProps> = ({
  prependLabel,
  variant = 'pending',
}) => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const fieldName = FIELD_NAMES[variant];
  const testSubj = TEST_SUBJS[variant];

  useEffect(() => {
    const currentCount = getValues(fieldName);
    if (currentCount == null) {
      setValue(fieldName, DEFAULT_COUNT);
    }
  }, [getValues, setValue, fieldName]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_NUMBER_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={{
        required: i18n.translate('xpack.alertingV2.ruleForm.stateTransition.countRequiredError', {
          defaultMessage: 'Consecutive breaches is required.',
        }),
        min: 1,
        max: MAX_CONSECUTIVE_BREACHES,
        validate: (value) => {
          if (value != null && !Number.isInteger(value)) {
            return i18n.translate('xpack.alertingV2.ruleForm.stateTransition.countIntegerError', {
              defaultMessage: 'Must be a whole number.',
            });
          }
          return true;
        },
      }}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
        <EuiFieldNumber
          value={value ?? DEFAULT_COUNT}
          onChange={(e) => {
            const parsedValue = parsePositiveIntegerInput(e.target.value);
            if (parsedValue != null && parsedValue <= MAX_CONSECUTIVE_BREACHES) {
              onChange(parsedValue);
            }
          }}
          onKeyDown={onKeyDown}
          min={1}
          max={MAX_CONSECUTIVE_BREACHES}
          step={1}
          isInvalid={!!error}
          data-test-subj={testSubj}
          inputRef={ref}
          fullWidth
          prepend={prependLabel ? [prependLabel] : undefined}
        />
      )}
    />
  );
};
