/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ComposeDiscoverAction, ComposeDiscoverState, RecoveryType } from '../types';
import type { CustomRecoveryRenderProps } from '../types';
import type { FormValues } from '../../../form/types';
import { ModeSelect } from '../../../form/fields/mode_select';
import { AlertDelayField } from '../../../form/fields/alert_delay_field';
import { NoDataStrategySelect } from '../../../form/fields/no_data_strategy_select';
import { RecoveryConditionStep } from './recovery_condition_step';

interface BehaviourStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  onKindChange: (kind: 'signal' | 'alert') => void;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  isEditing: boolean;
  builderType?: string;
  renderCustomRecovery?: (props: CustomRecoveryRenderProps) => React.ReactNode;
}

export const BehaviourStep: React.FC<BehaviourStepProps> = ({
  state,
  dispatch,
  onKindChange,
  onRecoveryTypeChange,
  isEditing,
  builderType,
  renderCustomRecovery,
}) => {
  const { setValue } = useFormContext<FormValues>();
  const isAlert = useWatch<FormValues, 'kind'>({ name: 'kind' }) === 'alert';
  const noDataStrategy = useWatch<FormValues, 'noDataStrategy'>({ name: 'noDataStrategy' });

  return (
    <>
      <ModeSelect
        value={isAlert ? 'alert' : 'signal'}
        onChange={onKindChange}
        disabled={(!builderType && !state.queryCommitted) || isEditing || state.childOpen}
        compressed
        data-test-subj="composeDiscoverModeSelect"
      />
      <EuiSpacer size="m" />
      {isAlert && (
        <>
          <RecoveryConditionStep
            state={state}
            dispatch={dispatch}
            onRecoveryTypeChange={onRecoveryTypeChange}
            renderCustomRecovery={renderCustomRecovery}
          />
          <EuiSpacer size="m" />
          <AlertDelayField />
          <EuiSpacer size="m" />
          <NoDataStrategySelect
            value={noDataStrategy ?? 'none'}
            onChange={(strategy) => setValue('noDataStrategy', strategy, { shouldDirty: true })}
            compressed
            data-test-subj="composeDiscoverNoDataStrategy"
          />
        </>
      )}
    </>
  );
};
