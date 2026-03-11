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

const TIMEFRAME_UNIT_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.ruleForm.stateTransition.timeframeUnitAriaLabel',
  { defaultMessage: 'Time unit' }
);

export type StateTransitionTimeframeVariant = 'pending' | 'recovering';

interface StateTransitionTimeframeFieldProps {
  numberPrependLabel?: string;
  /** Which state transition field to bind to. Defaults to 'pending'. */
  variant?: StateTransitionTimeframeVariant;
}

const FIELD_NAMES: Record<
  StateTransitionTimeframeVariant,
  'stateTransition.pendingTimeframe' | 'stateTransition.recoveringTimeframe'
> = {
  pending: 'stateTransition.pendingTimeframe',
  recovering: 'stateTransition.recoveringTimeframe',
};

const TEST_SUBJ_PREFIXES: Record<StateTransitionTimeframeVariant, string> = {
  pending: 'stateTransitionTimeframe',
  recovering: 'recoveryTransitionTimeframe',
};

export const StateTransitionTimeframeField: React.FC<StateTransitionTimeframeFieldProps> = ({
  numberPrependLabel,
  variant = 'pending',
}) => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const fieldName = FIELD_NAMES[variant];

  useEffect(() => {
    const currentTimeframe = getValues(fieldName);
    if (currentTimeframe == null) {
      setValue(fieldName, '2m');
    }
  }, [getValues, setValue, fieldName]);

  return (
    <Controller
      name={fieldName}
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
          numberLabel={numberPrependLabel ?? ''}
          unitAriaLabel={TIMEFRAME_UNIT_ARIA_LABEL}
          dataTestSubj={TEST_SUBJ_PREFIXES[variant]}
          idPrefix={TEST_SUBJ_PREFIXES[variant]}
        />
      )}
    />
  );
};
