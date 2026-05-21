/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  RecoveryType,
  StepDefinition,
} from '../types';
import { getStepIds, getBuilderStepIds } from '../use_compose_discover_state';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { RULE_BUILDER_REGISTRY } from '../rule_builder';
import { AlertConditionStep } from './alert_condition_step';
import { RecoveryConditionStep } from './recovery_condition_step';
import { DetailsAndArtifactsStep } from './details_and_artifacts_step';
import { NotificationsStep } from './notifications_step';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  builderType?: string;
  builderState?: unknown;
  onBuilderStateChange?: (state: unknown) => void;
}

const STEP_REGISTRY: Record<StepDefinition['id'], StepDefinition> = {
  alertCondition: {
    id: 'alertCondition',
    title: 'Alert Condition',
    render: (props) => (
      <AlertConditionStep state={props.state} dispatch={props.dispatch} services={props.services} />
    ),
    validate: (_methods, s) => s.queryCommitted,
  },
  builderCondition: {
    id: 'builderCondition',
    title: 'Alert Condition',
    render: () => null,
    validate: (_methods, s) => s.queryCommitted,
  },
  recoveryCondition: {
    id: 'recoveryCondition',
    title: 'Recovery Condition',
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
    title: 'Details & Artifacts',
    render: () => <DetailsAndArtifactsStep />,
    validate: async (methods) => methods.trigger(['metadata.name']),
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    render: () => <NotificationsStep />,
  },
};

export const getSteps = (tracking: boolean, builderType?: string): StepDefinition[] => {
  const ids = builderType ? getBuilderStepIds(tracking) : getStepIds(tracking);
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
            ? (_methods: any, s: ComposeDiscoverState) => definition.validate!(s)
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
  builderType,
  builderState,
  onBuilderStateChange,
}) => {
  const steps = getSteps(state.tracking, builderType);
  return steps[state.step].render({
    state,
    dispatch,
    services,
    onRecoveryTypeChange,
    builderState,
    onBuilderStateChange,
  });
};
