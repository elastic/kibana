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
import { deriveRecoveryDelayModeFromStateTransition } from '../utils/rule_request_mappers';
import { StateTransitionCountField } from './state_transition_count_field';
import { StateTransitionTimeframeField } from './state_transition_timeframe_field';
import { useRuleFormMeta } from '../contexts';

type DelayMode = 'immediate' | 'breaches' | 'duration';

const MODE_OPTION_IDS = {
  immediate: 'recovery_delay_mode_immediate',
  breaches: 'recovery_delay_mode_breaches',
  duration: 'recovery_delay_mode_duration',
} as const;

const MODE_OPTIONS = [
  {
    id: MODE_OPTION_IDS.immediate,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeImmediate', {
      defaultMessage: 'Immediate',
    }),
  },
  {
    id: MODE_OPTION_IDS.breaches,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeBreaches', {
      defaultMessage: 'Breaches',
    }),
  },
  {
    id: MODE_OPTION_IDS.duration,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeDuration', {
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

const DEFAULT_RECOVERING_COUNT = 2;
const DEFAULT_RECOVERING_TIMEFRAME = '2m';

export const RecoveryDelayField = () => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const stateTransition = useWatch({ control, name: 'stateTransition' });
  const selectedMode = useWatch({ control, name: 'stateTransitionRecoveryDelayMode' });
  const displayMode: DelayMode =
    selectedMode ?? deriveRecoveryDelayModeFromStateTransition(stateTransition);

  const onModeChange = useCallback(
    (optionId: string) => {
      const st = getValues('stateTransition') ?? {};
      const nextMode = modeFromOptionId(optionId);
      switch (nextMode) {
        case 'immediate':
          setValue('stateTransitionRecoveryDelayMode', 'immediate', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              recoveringCount: null,
              recoveringTimeframe: null,
            },
            { shouldDirty: true, shouldTouch: true }
          );
          break;
        case 'breaches':
          setValue('stateTransitionRecoveryDelayMode', 'breaches', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              recoveringCount: st.recoveringCount ?? DEFAULT_RECOVERING_COUNT,
              recoveringTimeframe: null,
            },
            { shouldDirty: true, shouldTouch: true }
          );
          break;
        case 'duration':
          setValue('stateTransitionRecoveryDelayMode', 'duration', { shouldDirty: true });
          setValue(
            'stateTransition',
            {
              ...st,
              recoveringCount: null,
              recoveringTimeframe: st.recoveringTimeframe ?? DEFAULT_RECOVERING_TIMEFRAME,
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
      label={i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.label', {
        defaultMessage: 'Recovery delay',
      })}
      fullWidth
      data-test-subj="recoveryDelayFormRow"
    >
      <>
        <EuiButtonGroup
          buttonSize={layout === 'flyout' ? 'compressed' : 's'}
          legend={i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeLegend', {
            defaultMessage: 'Recovery delay mode',
          })}
          options={MODE_OPTIONS}
          idSelected={optionIdForMode(displayMode)}
          onChange={onModeChange}
          isFullWidth
          data-test-subj="recoveryDelayMode"
        />
        <EuiSpacer size="s" />
        {displayMode === 'immediate' && (
          <EuiText size="xs" color="subdued" data-test-subj="recoveryDelayImmediateDescription">
            {i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.immediateDescription', {
              defaultMessage: 'No delay - Recovers on first non-breach',
            })}
          </EuiText>
        )}
        {displayMode === 'breaches' && (
          <StateTransitionCountField
            variant="recovering"
            prependLabel={i18n.translate(
              'xpack.alertingV2.ruleForm.recoveryDelay.inlineBreachesPrepend',
              { defaultMessage: 'Consecutive recoveries' }
            )}
          />
        )}
        {displayMode === 'duration' && (
          <StateTransitionTimeframeField
            variant="recovering"
            numberPrependLabel={i18n.translate(
              'xpack.alertingV2.ruleForm.recoveryDelay.inlineDurationPrepend',
              { defaultMessage: 'Recovering for' }
            )}
          />
        )}
      </>
    </EuiFormRow>
  );
};
