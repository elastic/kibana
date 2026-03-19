/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MAX_DURATION, validateMaxDuration } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { LookbackWindow } from './lookback_window';

const LOOKBACK_WINDOW_ROW_ID = 'ruleV2FormLookbackWindowField';

export const LookbackWindowField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      control={control}
      name="schedule.lookback"
      rules={{
        validate: (value) => {
          if (!value) return true;
          const error = validateMaxDuration(value, MAX_DURATION);
          if (error) {
            return i18n.translate('xpack.alertingV2.ruleForm.schedule.lookbackMaxError', {
              defaultMessage: 'Lookback window cannot exceed {max}.',
              values: { max: MAX_DURATION },
            });
          }
          return true;
        },
      }}
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          id={LOOKBACK_WINDOW_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.lookbackWindowLabel', {
            defaultMessage: 'Lookback Window',
          })}
          isInvalid={!!error}
          fullWidth
        >
          <LookbackWindow {...field} errors={error?.message} />
        </EuiFormRow>
      )}
    />
  );
};
