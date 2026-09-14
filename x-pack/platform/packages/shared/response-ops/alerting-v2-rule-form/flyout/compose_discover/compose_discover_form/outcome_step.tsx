/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import type {
  ComposeDiscoverAction,
  ComposeDiscoverState,
  CustomRecoveryRenderProps,
} from '../types';
import type { FormValues, RecoveryStrategy } from '../../../form/types';
import { KindSelect } from '../../../form/fields/kind_select';
import { AlertDelayField } from '../../../form/fields/alert_delay_field';
import { NoDataStrategySelect } from '../../../form/fields/no_data_strategy_select';
import { RecoveryConditionStep } from './recovery_condition_step';

interface OutcomeStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  onRecoveryTypeChange: (strategy: RecoveryStrategy) => void;
  onKindChange: (kind: 'signal' | 'alert') => void;
  isEditing: boolean;
  renderCustomRecovery?: (props: CustomRecoveryRenderProps) => React.ReactNode;
}

export function OutcomeStep({
  state,
  dispatch,
  onRecoveryTypeChange,
  onKindChange,
  isEditing,
  renderCustomRecovery,
}: OutcomeStepProps) {
  const { setValue } = useFormContext<FormValues>();
  const kind = useWatch<FormValues, 'kind'>({ name: 'kind' });
  const isAlert = kind === 'alert';
  const noDataStrategy = useWatch<FormValues, 'noDataStrategy'>({ name: 'noDataStrategy' });

  return (
    <>
      <KindSelect
        value={isAlert ? 'alert' : 'signal'}
        onChange={onKindChange}
        disabled={state.childOpen}
        readOnly={isEditing}
        data-test-subj="composeDiscoverKindSelect"
      />
      {isAlert && (
        <>
          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="m" />
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.composeDiscover.outcome.alertConditionsTitle"
                defaultMessage="Alert conditions"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AlertDelayField />
          <EuiSpacer size="m" />
          <NoDataStrategySelect
            value={noDataStrategy ?? 'none'}
            onChange={(strategy) => setValue('noDataStrategy', strategy, { shouldDirty: true })}
            compressed
            data-test-subj="composeDiscoverNoDataStrategy"
          />
          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="m" />
          <RecoveryConditionStep
            state={state}
            dispatch={dispatch}
            onRecoveryTypeChange={onRecoveryTypeChange}
            renderCustomRecovery={renderCustomRecovery}
          />
        </>
      )}
    </>
  );
}
