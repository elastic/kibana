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

const DEFAULT_PENDING_COUNT = 2;

const validateMax = (val: number) => val <= MAX_CONSECUTIVE_BREACHES;

interface StateTransitionCountFieldProps {
  prependLabel?: string;
}

export const StateTransitionCountField: React.FC<StateTransitionCountFieldProps> = ({
  prependLabel,
}) => {
  const { control, getValues, setValue } = useFormContext<FormValues>();

  useEffect(() => {
    const currentCount = getValues('stateTransition.pendingCount');
    if (currentCount == null) {
      setValue('stateTransition.pendingCount', DEFAULT_PENDING_COUNT);
    }
  }, [getValues, setValue]);

  return (
    <Controller
      name="stateTransition.pendingCount"
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
          value={value ?? DEFAULT_PENDING_COUNT}
          onChange={onChange}
          validate={validateMax}
          min={1}
          max={MAX_CONSECUTIVE_BREACHES}
          step={1}
          isInvalid={!!error}
          data-test-subj="stateTransitionCountInput"
          fullWidth
          prepend={prependLabel ? [prependLabel] : undefined}
        />
      )}
    />
  );
};
