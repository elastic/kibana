/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MAX_DURATION, parseDurationToMs, validateMaxDuration } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { LookbackWindow } from './lookback_window';
import { useRuleFormMeta } from '../contexts';
import { FormLabelWithQuestionTip } from './form_label_with_help';

const LOOKBACK_WINDOW_ROW_ID = 'ruleV2FormLookbackWindowField';

const LOOKBACK_LABEL = i18n.translate('xpack.alertingV2.ruleForm.lookbackWindowLabel', {
  defaultMessage: 'Lookback Window',
});

const LOOKBACK_TIP = i18n.translate('xpack.alertingV2.ruleForm.lookbackWindowTooltip', {
  defaultMessage:
    'How far back each run searches, using the time field. This is separate from how often the rule runs.',
});

const LOOKBACK_LESS_THAN_INTERVAL_WARNING = i18n.translate(
  'xpack.alertingV2.ruleForm.schedule.lookbackLessThanIntervalWarning',
  {
    defaultMessage:
      'Lookback window is shorter than the schedule interval. Some data may be missed between evaluations.',
  }
);

export const LookbackWindowField = () => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const scheduleEvery = useWatch({ control, name: 'schedule.every' });

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
      render={({ field, fieldState: { error } }) => {
        let showIntervalWarning = false;
        if (field.value && scheduleEvery) {
          const lookbackMs = parseDurationToMs(field.value);
          const everyMs = parseDurationToMs(scheduleEvery);
          showIntervalWarning = !isNaN(lookbackMs) && !isNaN(everyMs) && lookbackMs < everyMs;
        }

        return (
          <EuiFormRow
            id={LOOKBACK_WINDOW_ROW_ID}
            label={
              <FormLabelWithQuestionTip
                label={LOOKBACK_LABEL}
                tip={LOOKBACK_TIP}
                data-test-subj="ruleLookbackWindowHelpTip"
              />
            }
            helpText={showIntervalWarning ? LOOKBACK_LESS_THAN_INTERVAL_WARNING : undefined}
            isInvalid={!!error}
            fullWidth
          >
            <LookbackWindow {...field} errors={error?.message} compressed={layout === 'flyout'} />
          </EuiFormRow>
        );
      }}
    />
  );
};
