/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { MAX_CONSECUTIVE_BREACHES } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { NumberInput } from './number_input';

const DEFAULT_COUNT = 2;

export type StateTransitionCountVariant = 'pending' | 'recovering';

const validateMax = (val: number) => val <= MAX_CONSECUTIVE_BREACHES;

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

export const StateTransitionCountField = ({
  prependLabel,
  variant = 'pending',
}: StateTransitionCountFieldProps) => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const fieldName = FIELD_NAMES[variant];
  const testSubj = TEST_SUBJS[variant];

  useEffect(() => {
    const currentCount = getValues(fieldName);
    if (currentCount == null) {
      setValue(fieldName, DEFAULT_COUNT);
    }
  }, [getValues, setValue, fieldName]);

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
        <NumberInput
          ref={ref}
          value={value ?? DEFAULT_COUNT}
          onChange={onChange}
          validate={validateMax}
          min={1}
          max={MAX_CONSECUTIVE_BREACHES}
          step={1}
          isInvalid={!!error}
          data-test-subj={testSubj}
          fullWidth
          prepend={prependLabel ? [prependLabel] : undefined}
        />
      )}
    />
  );
};
