/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { deriveAlertDelayModeFromStateTransition } from '../utils/rule_request_mappers';
import { StateTransitionCountField } from './state_transition_count_field';
import { StateTransitionTimeframeField } from './state_transition_timeframe_field';
import { useRuleFormMeta } from '../contexts';

type DelayMode = 'immediate' | 'breaches' | 'duration';

const MODE_OPTION_IDS = {
  immediate: 'alert_delay_mode_immediate',
  breaches: 'alert_delay_mode_breaches',
  duration: 'alert_delay_mode_duration',
} as const;

const MODE_OPTIONS = [
  {
    id: MODE_OPTION_IDS.immediate,
    label: i18n.translate('xpack.alertingV2.ruleForm.alertDelay.delayModeImmediate', {
      defaultMessage: 'Immediate',
    }),
  },
  {
    id: MODE_OPTION_IDS.breaches,
    label: i18n.translate('xpack.alertingV2.ruleForm.alertDelay.delayModeBreaches', {
      defaultMessage: 'Breaches',
    }),
  },
  {
    id: MODE_OPTION_IDS.duration,
    label: i18n.translate('xpack.alertingV2.ruleForm.alertDelay.delayModeDuration', {
      defaultMessage: 'Duration',
    }),
  },
];

const modeFromOptionId = (id: string): DelayMode => {
  if (id === MODE_OPTION_IDS.immediate) return 'immediate';
  if (id === MODE_OPTION_IDS.duration) return 'duration';
  return 'breaches';
};

const optionIdForMode = (mode: DelayMode): string => {
  if (mode === 'immediate') return MODE_OPTION_IDS.immediate;
  if (mode === 'duration') return MODE_OPTION_IDS.duration;
  return MODE_OPTION_IDS.breaches;
};

const DEFAULT_PENDING_COUNT = 2;
const DEFAULT_PENDING_TIMEFRAME = '2m';

export const AlertDelayField = () => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const stateTransition = useWatch({ control, name: 'stateTransition' });
  const selectedMode = useWatch({ control, name: 'stateTransitionAlertDelayMode' });
  const displayMode: DelayMode =
    selectedMode ?? deriveAlertDelayModeFromStateTransition(stateTransition);

  const onModeChange = useCallback(
    (optionId: string) => {
      const st = getValues('stateTransition') ?? {};
      const nextMode = modeFromOptionId(optionId);
      switch (nextMode) {
        case 'immediate':
          setValue('stateTransitionAlertDelayMode', 'immediate', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              pendingCount: null,
              pendingTimeframe: null,
            },
            { shouldDirty: true, shouldTouch: true }
          );
          break;
        case 'breaches':
          setValue('stateTransitionAlertDelayMode', 'breaches', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              pendingCount: st.pendingCount ?? DEFAULT_PENDING_COUNT,
              pendingTimeframe: null,
            },
            { shouldDirty: true, shouldTouch: true }
          );
          break;
        case 'duration':
          setValue('stateTransitionAlertDelayMode', 'duration', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              pendingCount: null,
              pendingTimeframe: st.pendingTimeframe ?? DEFAULT_PENDING_TIMEFRAME,
            },
            { shouldDirty: true, shouldTouch: true }
          );
          break;
      }
    },
    [getValues, setValue]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.ruleForm.alertDelay.label', {
        defaultMessage: 'Alert delay',
      })}
      fullWidth
      data-test-subj="alertDelayFormRow"
    >
      <>
        <EuiButtonGroup
          buttonSize={layout === 'flyout' ? 'compressed' : 's'}
          legend={i18n.translate('xpack.alertingV2.ruleForm.alertDelay.delayModeLegend', {
            defaultMessage: 'Alert delay mode',
          })}
          options={MODE_OPTIONS}
          idSelected={optionIdForMode(displayMode)}
          onChange={onModeChange}
          isFullWidth
          data-test-subj="stateTransitionDelayMode"
        />
        <EuiSpacer size="s" />
        {displayMode === 'immediate' && (
          <EuiText size="xs" color="subdued" data-test-subj="stateTransitionImmediateDescription">
            {i18n.translate('xpack.alertingV2.ruleForm.alertDelay.immediateDescription', {
              defaultMessage: 'No delay - Alerts on first breach',
            })}
          </EuiText>
        )}
        {displayMode === 'breaches' && (
          <StateTransitionCountField
            variant="pending"
            prependLabel={i18n.translate(
              'xpack.alertingV2.ruleForm.alertDelay.inlineBreachesPrepend',
              { defaultMessage: 'Consecutive breaches' }
            )}
          />
        )}
        {displayMode === 'duration' && (
          <StateTransitionTimeframeField
            variant="pending"
            numberPrependLabel={i18n.translate(
              'xpack.alertingV2.ruleForm.alertDelay.inlineDurationPrepend',
              { defaultMessage: 'Active for' }
            )}
          />
        )}
      </>
    </EuiFormRow>
  );
};
