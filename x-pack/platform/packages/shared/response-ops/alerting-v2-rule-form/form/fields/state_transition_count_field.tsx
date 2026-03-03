/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

export const StateTransitionCountField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  return (
    <Controller
      name="stateTransition.pendingCount"
      control={control}
      rules={{
        min: {
          value: 1,
          message: i18n.translate('xpack.alertingV2.ruleForm.stateTransition.countMinError', {
            defaultMessage: 'Must be at least 1.',
          }),
        },
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
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.countLabel', {
            defaultMessage: 'Consecutive breaches',
          })}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.countHelpText', {
            defaultMessage: 'Number of consecutive breaches before the alert becomes active.',
          })}
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiFieldNumber
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === '') {
                onChange(undefined);
              } else {
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed)) {
                  onChange(parsed);
                }
              }
            }}
            onKeyDown={onKeyDown}
            min={1}
            step={1}
            isInvalid={!!error}
            data-test-subj="stateTransitionCountInput"
            placeholder="1"
            inputRef={ref}
          />
        </EuiFormRow>
      )}
    />
  );
};
