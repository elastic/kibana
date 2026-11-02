/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MAX_DURATION, validateMaxDuration } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { DurationInput } from './duration_input';
import { useRuleFormMeta } from '../contexts';

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

export const StateTransitionTimeframeField = ({
  numberPrependLabel,
  variant = 'pending',
}: StateTransitionTimeframeFieldProps) => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const fieldName = FIELD_NAMES[variant];

  return (
    <Controller
      name={fieldName}
      control={control}
      defaultValue="2m"
      rules={{
        required: i18n.translate(
          'xpack.alertingV2.ruleForm.stateTransition.timeframeRequiredError',
          {
            defaultMessage: 'Duration is required.',
          }
        ),
        validate: (value) => {
          if (!value) return true;
          const error = validateMaxDuration(value, MAX_DURATION);
          if (error) {
            return i18n.translate('xpack.alertingV2.ruleForm.stateTransition.timeframeMaxError', {
              defaultMessage: 'Duration cannot exceed {max}.',
              values: { max: MAX_DURATION },
            });
          }
          return true;
        },
      }}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
        <DurationInput
          ref={ref}
          value={value ?? '2m'}
          onChange={onChange}
          fallback="2m"
          errors={error?.message}
          numberLabel={numberPrependLabel}
          unitAriaLabel={TIMEFRAME_UNIT_ARIA_LABEL}
          dataTestSubj={TEST_SUBJ_PREFIXES[variant]}
          idPrefix={TEST_SUBJ_PREFIXES[variant]}
          compressed={layout === 'flyout'}
        />
      )}
    />
  );
};
