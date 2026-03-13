/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { StateTransitionCountField } from './state_transition_count_field';
import { StateTransitionTimeframeField } from './state_transition_timeframe_field';

type DelayMode = 'immediate' | 'breaches' | 'duration';

const MODE_OPTIONS = [
  {
    id: 'immediate' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeImmediate', {
      defaultMessage: 'Immediate',
    }),
  },
  {
    id: 'breaches' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeBreaches', {
      defaultMessage: 'Breaches',
    }),
  },
  {
    id: 'duration' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeDuration', {
      defaultMessage: 'Duration',
    }),
  },
];

const DEFAULT_RECOVERING_COUNT = 2;
const DEFAULT_RECOVERING_TIMEFRAME = '2m';

const deriveMode = (stateTransition?: {
  recoveringTimeframe?: string;
  recoveringCount?: number;
}): DelayMode => {
  if (stateTransition?.recoveringTimeframe != null) return 'duration';
  if (stateTransition?.recoveringCount != null) return 'breaches';
  return 'immediate';
};

export const RecoveryDelayField = () => {
  const { control, setValue } = useFormContext<FormValues>();
  const stateTransition = useWatch({ control, name: 'stateTransition' });
  const [selectedMode, setSelectedMode] = useState<DelayMode>(deriveMode(stateTransition));

  const onModeChange = useCallback(
    (mode: string) => {
      switch (mode as DelayMode) {
        case 'immediate':
          setSelectedMode('immediate');
          setValue('stateTransition.recoveringCount', undefined);
          setValue('stateTransition.recoveringTimeframe', undefined);
          break;
        case 'breaches':
          setSelectedMode('breaches');
          setValue(
            'stateTransition.recoveringCount',
            stateTransition?.recoveringCount ?? DEFAULT_RECOVERING_COUNT
          );
          setValue('stateTransition.recoveringTimeframe', undefined);
          break;
        case 'duration':
          setSelectedMode('duration');
          setValue('stateTransition.recoveringCount', undefined);
          setValue(
            'stateTransition.recoveringTimeframe',
            stateTransition?.recoveringTimeframe ?? DEFAULT_RECOVERING_TIMEFRAME
          );
          break;
      }
    },
    [setValue, stateTransition?.recoveringCount, stateTransition?.recoveringTimeframe]
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
          buttonSize="s"
          legend={i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.delayModeLegend', {
            defaultMessage: 'Recovery delay mode',
          })}
          options={MODE_OPTIONS}
          idSelected={selectedMode}
          onChange={onModeChange}
          isFullWidth
          data-test-subj="recoveryDelayMode"
        />
        <EuiSpacer size="s" />
        {selectedMode === 'immediate' && (
          <EuiText size="xs" color="subdued" data-test-subj="recoveryDelayImmediateDescription">
            {i18n.translate('xpack.alertingV2.ruleForm.recoveryDelay.immediateDescription', {
              defaultMessage: 'No delay - Recovers on first non-breach',
            })}
          </EuiText>
        )}
        {selectedMode === 'breaches' && (
          <StateTransitionCountField
            variant="recovering"
            prependLabel={i18n.translate(
              'xpack.alertingV2.ruleForm.recoveryDelay.inlineBreachesPrepend',
              { defaultMessage: 'Consecutive recoveries' }
            )}
          />
        )}
        {selectedMode === 'duration' && (
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
