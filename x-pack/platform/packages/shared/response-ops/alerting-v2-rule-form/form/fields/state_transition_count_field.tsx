/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { INVALID_NUMBER_KEYS, parsePositiveIntegerInput } from '../utils';

interface StateTransitionCountFieldProps {
  prependLabel?: string;
}

export const StateTransitionCountField: React.FC<StateTransitionCountFieldProps> = ({
  prependLabel,
}) => {
  const { control } = useFormContext<FormValues>();

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (INVALID_NUMBER_KEYS.includes(e.key)) {
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
        <EuiFieldNumber
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value.trim();
            if (val === '') {
              onChange(undefined);
            } else {
              const parsedValue = parsePositiveIntegerInput(e.target.value);
              if (parsedValue != null) {
                onChange(parsedValue);
              }
            }
          }}
          onKeyDown={onKeyDown}
          min={1}
          step={1}
          isInvalid={!!error}
          data-test-subj="stateTransitionCountInput"
          inputRef={ref}
          fullWidth
          prepend={prependLabel ? [prependLabel] : undefined}
        />
      )}
    />
  );
};
