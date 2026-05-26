/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useWatch } from 'react-hook-form';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  RecoveryType,
  StepDefinition,
} from '../types';
import { getStepIds, getBuilderStepIds } from '../use_compose_discover_state';
import type { ComposeFormValues } from '../compose_form_types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { RULE_BUILDER_REGISTRY } from '../rule_builder';
import { AlertConditionStep } from './alert_condition_step';
import { RecoveryConditionStep } from './recovery_condition_step';
import { DetailsAndArtifactsStep } from './details_and_artifacts_step';
import { NotificationsStep } from './notifications_step';
import { LinkedActionPoliciesStep } from './linked_action_policies_step';
import { CentralizedActionPoliciesPanel } from './centralized_action_policies_panel';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  onKindChange: (kind: 'signal' | 'alert') => void;
  ruleId?: string;
  builderType?: string;
  builderState?: unknown;
  onBuilderStateChange?: (state: unknown) => void;
}

const STEP_REGISTRY: Record<StepDefinition['id'], StepDefinition> = {
  alertCondition: {
    id: 'alertCondition',
    title: i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.stepTitle', {
      defaultMessage: 'Alert Condition',
    }),
    render: (props) => (
      <AlertConditionStep
        state={props.state}
        dispatch={props.dispatch}
        services={props.services}
        onKindChange={props.onKindChange}
      />
    ),
    validate: (_methods, s) => s.queryCommitted,
  },
  builderCondition: {
    id: 'builderCondition',
    title: i18n.translate('xpack.alertingV2.composeDiscover.step.builderCondition', {
      defaultMessage: 'Alert Condition',
    }),
    render: () => null,
    validate: (_methods, s) => s.queryCommitted,
  },
  recoveryCondition: {
    id: 'recoveryCondition',
    title: i18n.translate('xpack.alertingV2.composeDiscover.recoveryCondition.stepTitle', {
      defaultMessage: 'Recovery Condition',
    }),
    render: (props) => (
      <RecoveryConditionStep
        state={props.state}
        dispatch={props.dispatch}
        onRecoveryTypeChange={props.onRecoveryTypeChange}
      />
    ),
  },
  details: {
    id: 'details',
    title: i18n.translate('xpack.alertingV2.composeDiscover.details.stepTitle', {
      defaultMessage: 'Details & Artifacts',
    }),
    render: () => <DetailsAndArtifactsStep />,
    validate: async (methods) => methods.trigger(['metadata.name']),
  },
  notifications: {
    id: 'notifications',
    title: i18n.translate('xpack.alertingV2.composeDiscover.notifications.stepTitle', {
      defaultMessage: 'Actions',
    }),
    render: (props) => (
      <>
        <CentralizedActionPoliciesPanel http={props.services.http} />
        <EuiSpacer size="m" />
        <LinkedActionPoliciesStep http={props.services.http} ruleId={props.ruleId} />
        {props.state.mode !== 'edit' && (
          <>
            <EuiHorizontalRule margin="m" />
            <NotificationsStep services={props.services} />
          </>
        )}
      </>
    ),
    validate: (methods, state, services) => {
      if (state.mode === 'edit') return true;
      const notifs = methods.getValues('notifications');
      if (!notifs) return true;
      return services?.workflowForm?.isValid?.(notifs.workflow) ?? true;
    },
  },
};

export const getSteps = (isAlert: boolean, builderType?: string): StepDefinition[] => {
  const ids = builderType ? getBuilderStepIds(isAlert) : getStepIds(isAlert);
  return ids.map((id) => {
    const base = STEP_REGISTRY[id];
    if (id === 'builderCondition' && builderType) {
      const definition = RULE_BUILDER_REGISTRY[builderType];
      if (definition) {
        return {
          ...base,
          title: definition.stepTitle,
          render: (props) => {
            if (!props.builderState || !props.onBuilderStateChange) return null;
            return definition.renderStep({
              state: props.state,
              dispatch: props.dispatch,
              services: props.services,
              builderState: props.builderState,
              onBuilderStateChange: props.onBuilderStateChange,
            });
          },
          validate: definition.validate
            ? (_methods, s, _services, bs) => definition.validate!(s, bs)
            : base.validate,
        };
      }
    }
    return base;
  });
};

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({
  state,
  dispatch,
  services,
  onRecoveryTypeChange,
  onKindChange,
  ruleId,
  builderType,
  builderState,
  onBuilderStateChange,
}) => {
  const isAlert = useWatch<ComposeFormValues, 'kind'>({ name: 'kind' }) === 'alert';
  const steps = getSteps(isAlert, builderType);
  return steps[state.step].render({
    state,
    dispatch,
    services,
    onRecoveryTypeChange,
    onKindChange,
    ruleId,
    builderState,
    onBuilderStateChange,
  });
};
