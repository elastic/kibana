/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { DurationInput } from './duration_input';

const TIMEFRAME_UNIT_LABEL = i18n.translate(
  'xpack.alertingV2.ruleForm.stateTransition.timeframeUnitLabel',
  { defaultMessage: 'Time unit' }
);

interface StateTransitionTimeframeFieldProps {
  numberPrependLabel: string;
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
        <DurationInput
          ref={ref}
          value={value ?? '2m'}
          onChange={onChange}
          errors={error?.message}
          numberLabel={numberPrependLabel}
          unitLabel={TIMEFRAME_UNIT_LABEL}
          dataTestSubj="stateTransitionTimeframe"
          idPrefix="stateTransitionTimeframe"
        />
      )}
    />
  );
};
