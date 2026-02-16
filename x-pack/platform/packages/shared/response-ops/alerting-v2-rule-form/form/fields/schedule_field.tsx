/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { RuleSchedule } from './rule_schedule';

const SCHEDULE_ROW_ID = 'ruleV2FormScheduleField';

export const ScheduleField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      control={control}
      name="schedule.every"
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          id={SCHEDULE_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.scheduleLabel', {
            defaultMessage: 'Schedule',
          })}
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
          error={error?.message}
        >
          <RuleSchedule {...field} errors={error?.message} />
        </EuiFormRow>
      )}
    />
  );
};
