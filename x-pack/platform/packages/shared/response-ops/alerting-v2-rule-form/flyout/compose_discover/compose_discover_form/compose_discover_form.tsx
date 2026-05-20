/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  RecoveryType,
  StepDefinition,
} from '../types';
import { getStepIds } from '../use_compose_discover_state';
import type { ComposeFormValues } from '../compose_form_types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { AlertConditionStep } from './alert_condition_step';
import { RecoveryConditionStep } from './recovery_condition_step';
import { DetailsAndArtifactsStep } from './details_and_artifacts_step';
import { NotificationsStep } from './notifications_step';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  onKindChange: (kind: 'signal' | 'alert') => void;
}

const STEP_REGISTRY: Record<StepDefinition['id'], StepDefinition> = {
  alertCondition: {
    id: 'alertCondition',
    title: 'Alert Condition',
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

export const getSteps = (isAlert: boolean): StepDefinition[] =>
  getStepIds(isAlert).map((id) => STEP_REGISTRY[id]);

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({
  state,
  dispatch,
  services,
  onRecoveryTypeChange,
  onKindChange,
}) => {
  const isAlert = useWatch<ComposeFormValues, 'kind'>({ name: 'kind' }) === 'alert';
  const steps = getSteps(isAlert);
  return steps[state.step].render({
    state,
    dispatch,
    services,
    onRecoveryTypeChange,
    onKindChange,
  });
};
