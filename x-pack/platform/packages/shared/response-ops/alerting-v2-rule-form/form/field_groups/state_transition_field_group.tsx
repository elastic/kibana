/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { StateTransitionCountField } from '../fields/state_transition_count_field';
import { StateTransitionTimeframeField } from '../fields/state_transition_timeframe_field';

type DelayMode = 'immediate' | 'breaches' | 'duration';

const MODE_OPTIONS = [
  {
    id: 'immediate' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.stateTransition.delayModeImmediate', {
      defaultMessage: 'Immediate',
    }),
  },
  {
    id: 'breaches' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.stateTransition.delayModeBreaches', {
      defaultMessage: 'Breaches',
    }),
  },
  {
    id: 'duration' as const,
    label: i18n.translate('xpack.alertingV2.ruleForm.stateTransition.delayModeDuration', {
      defaultMessage: 'Duration',
    }),
  },
];

const DEFAULT_PENDING_COUNT = 2;
const DEFAULT_PENDING_TIMEFRAME = '2m';

const deriveMode = (stateTransition?: {
  pendingTimeframe?: string;
  pendingCount?: number;
}): DelayMode => {
  if (stateTransition?.pendingTimeframe != null) return 'duration';
  if (stateTransition?.pendingCount != null) return 'breaches';
  return 'immediate';
};

export const StateTransitionFieldGroup: React.FC = () => {
  const { control, setValue } = useFormContext<FormValues>();
  const kind = useWatch({ control, name: 'kind' });
  const stateTransition = useWatch({ control, name: 'stateTransition' });
  const [selectedMode, setSelectedMode] = useState<DelayMode>(deriveMode(stateTransition));

  const onModeChange = useCallback(
    (mode: string) => {
      switch (mode as DelayMode) {
        case 'immediate':
          setSelectedMode('immediate');
          setValue('stateTransition', undefined);
          break;
        case 'breaches':
          setSelectedMode('breaches');
          setValue(
            'stateTransition.pendingCount',
            stateTransition?.pendingCount ?? DEFAULT_PENDING_COUNT
          );
          setValue('stateTransition.pendingTimeframe', undefined);
          break;
        case 'duration':
          setSelectedMode('duration');
          setValue('stateTransition.pendingCount', undefined);
          setValue(
            'stateTransition.pendingTimeframe',
            stateTransition?.pendingTimeframe ?? DEFAULT_PENDING_TIMEFRAME
          );
          break;
      }
    },
    [setValue, stateTransition?.pendingCount, stateTransition?.pendingTimeframe]
  );

  if (kind !== 'alert') {
    return null;
  }

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.title', {
        defaultMessage: 'Alert delay',
      })}
    >
      <EuiButtonGroup
        buttonSize="compressed"
        legend={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.delayModeLegend', {
          defaultMessage: 'Alert delay mode',
        })}
        options={MODE_OPTIONS}
        idSelected={selectedMode}
        onChange={onModeChange}
        isFullWidth
        data-test-subj="stateTransitionDelayMode"
      />
      <EuiSpacer size="s" />
      {selectedMode === 'immediate' && (
        <EuiText size="xs" color="subdued" data-test-subj="stateTransitionImmediateDescription">
          {i18n.translate('xpack.alertingV2.ruleForm.stateTransition.immediateDescription', {
            defaultMessage: 'No delay - Alerts on first breach',
          })}
        </EuiText>
      )}
      {selectedMode === 'breaches' && (
        <StateTransitionCountField
          prependLabel={i18n.translate(
            'xpack.alertingV2.ruleForm.stateTransition.inlineBreachesPrepend',
            { defaultMessage: 'Consecutive breaches' }
          )}
        />
      )}
      {selectedMode === 'duration' && (
        <StateTransitionTimeframeField
          numberPrependLabel={i18n.translate(
            'xpack.alertingV2.ruleForm.stateTransition.inlineDurationPrepend',
            { defaultMessage: 'Active for' }
          )}
        />
      )}
    </FieldGroup>
  );
};
