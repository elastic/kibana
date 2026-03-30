/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  MAX_DURATION,
  MIN_SCHEDULE_INTERVAL,
  validateMaxDuration,
  validateMinDuration,
} from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { RuleSchedule } from './rule_schedule';

const SCHEDULE_ROW_ID = 'ruleV2FormScheduleField';

export const ScheduleField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      control={control}
      name="schedule.every"
      rules={{
        validate: (value) => {
          if (!value) return true;
          const minError = validateMinDuration(value, MIN_SCHEDULE_INTERVAL);
          if (minError) {
            return i18n.translate('xpack.alertingV2.ruleForm.schedule.everyMinError', {
              defaultMessage: 'Schedule cannot be less than {min}.',
              values: { min: MIN_SCHEDULE_INTERVAL },
            });
          }
          const maxError = validateMaxDuration(value, MAX_DURATION);
          if (maxError) {
            return i18n.translate('xpack.alertingV2.ruleForm.schedule.everyMaxError', {
              defaultMessage: 'Schedule cannot exceed {max}.',
              values: { max: MAX_DURATION },
            });
          }
          return true;
        },
      }}
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          id={SCHEDULE_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.scheduleLabel', {
            defaultMessage: 'Schedule',
          })}
          fullWidth
          helpText={
            <>
              {i18n.translate('xpack.alertingV2.ruleForm.scheduleHelpText', {
                defaultMessage: 'Set the frequency to check the alert conditions',
              })}
              &nbsp;
              <EuiIconTip
                position="right"
                type="question"
                content={i18n.translate('xpack.alertingV2.ruleForm.scheduleTooltip', {
                  defaultMessage:
                    'The frequency of how often the rule runs. This check can be delayed based on the Kibana polling frequency.',
                })}
              />
            </>
          }
          isInvalid={!!error}
        >
          <RuleSchedule {...field} errors={error?.message} />
        </EuiFormRow>
      )}
    />
  );
};
