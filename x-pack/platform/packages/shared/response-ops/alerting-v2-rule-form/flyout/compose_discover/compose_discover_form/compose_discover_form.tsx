/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWatch } from 'react-hook-form';
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  StepDefinition,
  StepRenderProps,
} from '../types';
import { isAlertConditionStepId } from '../types';
import { getStepIds, getBuilderStepIds } from '../use_compose_discover_state';
import type { FormValues, RecoveryStrategy } from '../../../form/types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { RULE_BUILDER_REGISTRY } from '../rule_builder';
import { ScheduleField } from '../../../form/fields/schedule_field';
import { LookbackWindowField } from '../../../form/fields/lookback_window_field';
import { AlertConditionStep } from './alert_condition_step';
import { OutcomeStep } from './outcome_step';
import { EsqlRecoveryContent } from './esql_recovery_content';
import { DetailsAndArtifactsStep } from './details_and_artifacts_step';
import { NotificationsStep } from './notifications_step';
import { LinkedActionPoliciesStep } from './linked_action_policies_step';
import { QueryFieldRules } from './query_field_rules';

interface Props {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  onRecoveryTypeChange: (strategy: RecoveryStrategy) => void;
  onKindChange: (kind: 'signal' | 'alert') => void;
  isEditing: boolean;
  ruleId?: string;
  builderType?: string;
}

const STEP_REGISTRY: Record<StepDefinition['id'], StepDefinition> = {
  alertCondition: {
    id: 'alertCondition',
    title: i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.stepTitle', {
      defaultMessage: 'Condition',
    }),
    render: (props) => (
      <AlertConditionStep
        state={props.state}
        dispatch={props.dispatch}
        services={props.services}
        isEditing={props.isEditing}
      />
    ),
    fields: ['query'],
    meetsPrecondition: (s) => s.queryCommitted,
  },
  builderCondition: {
    id: 'builderCondition',
    title: i18n.translate('xpack.alertingV2.composeDiscover.step.builderCondition', {
      defaultMessage: 'Condition',
    }),
    render: () => null,
  },
  outcome: {
    id: 'outcome',
    title: i18n.translate('xpack.alertingV2.composeDiscover.outcome.stepTitle', {
      defaultMessage: 'Outcome',
    }),
    render: (props) => (
      <OutcomeStep
        state={props.state}
        dispatch={props.dispatch}
        onRecoveryTypeChange={props.onRecoveryTypeChange}
        onKindChange={props.onKindChange}
        isEditing={props.isEditing}
        renderCustomRecovery={props.renderCustomRecovery}
      />
    ),
  },
  details: {
    id: 'details',
    title: i18n.translate('xpack.alertingV2.composeDiscover.details.stepTitle', {
      defaultMessage: 'Details & Artifacts',
    }),
    render: () => <DetailsAndArtifactsStep />,
    fields: ['metadata.name'],
  },
  notifications: {
    id: 'notifications',
    title: i18n.translate('xpack.alertingV2.composeDiscover.notifications.stepTitle', {
      defaultMessage: 'Actions',
    }),
    render: (props) => (
      <>
        <LinkedActionPoliciesStep http={props.services.http} ruleId={props.ruleId} />
        <EuiHorizontalRule margin="m" />
        <NotificationsStep />
      </>
    ),
    fields: ['notifications'],
  },
};

interface ResolvedSteps {
  steps: StepDefinition[];
  renderCustomRecovery?: StepRenderProps['renderCustomRecovery'];
}

export const getSteps = (isAlert: boolean, builderType?: string): ResolvedSteps => {
  const ids = builderType ? getBuilderStepIds(isAlert) : getStepIds(isAlert);
  const definition = builderType ? RULE_BUILDER_REGISTRY[builderType] : undefined;

  const steps = ids.map((id) => {
    const base = STEP_REGISTRY[id];
    if (id === 'builderCondition' && definition) {
      // Discard any ES|QL registry keys if the stub ever gains them.
      const {
        meetsPrecondition: _meetsPrecondition,
        validate: _validate,
        fields: _fields,
        ...builderBase
      } = base;
      const builderValidate = definition.validate;
      const builderStep: StepDefinition = {
        ...builderBase,
        title: definition.stepTitle,
        render: (props) =>
          definition.renderStep({
            state: props.state,
            dispatch: props.dispatch,
            services: props.services,
          }),
        ...(builderValidate
          ? {
              validate: (_methods, s, _services, bs) => builderValidate(s, bs),
            }
          : {}),
      };
      return builderStep;
    }
    return base;
  });

  /*
   * Pass a component (or registry render function). RecoveryConditionStep mounts
   * it with createElement so hook-using recovery content keeps its own fiber.
   */
  const renderCustomRecovery = definition?.renderRecoveryStep ?? EsqlRecoveryContent;

  return { steps, renderCustomRecovery };
};

export const ComposeDiscoverForm = ({
  state,
  dispatch,
  services,
  onRecoveryTypeChange,
  onKindChange,
  isEditing,
  ruleId,
  builderType,
}: Props) => {
  const isAlert = useWatch<FormValues, 'kind'>({ name: 'kind' }) === 'alert';
  const { steps, renderCustomRecovery } = useMemo(
    () => getSteps(isAlert, builderType),
    [isAlert, builderType]
  );
  const currentStep = steps[state.step];
  const isAlertConditionStep = isAlertConditionStepId(currentStep.id);

  const stepContent = currentStep.render({
    state,
    dispatch,
    services,
    onRecoveryTypeChange,
    onKindChange,
    isEditing,
    ruleId,
    renderCustomRecovery,
  });

  return (
    <>
      {/* Keep query rules mounted across steps so trigger(['query']) cannot no-op. */}
      {!builderType && <QueryFieldRules queryCommitted={state.queryCommitted} />}
      {!isAlertConditionStep ? (
        stepContent
      ) : (
        <>
          {stepContent}
          <EuiHorizontalRule margin="m" />
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.composeDiscover.alertCondition.ruleExecutionTitle"
                defaultMessage="Rule execution"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <ScheduleField />
          <EuiSpacer size="m" />
          <LookbackWindowField />
        </>
      )}
    </>
  );
};
