/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import type { RuleKind } from './compose_form_types';
import type {
  StepId,
  ComposeDiscoverState,
  ComposeDiscoverAction,
  ComposeDiscoverMode,
  QueryTab,
  SandboxTabConfig,
  RecoveryType,
} from './types';

export const getStepIds = (tracking: boolean): StepId[] =>
  tracking
    ? ['alertCondition', 'recoveryCondition', 'details', 'notifications']
    : ['alertCondition', 'details', 'notifications'];

export interface InitialStateConfig {
  mode: ComposeDiscoverMode;
  initialKind?: RuleKind;
  initialRecoveryType?: RecoveryType;
}

export const createInitialState = ({
  mode,
  initialKind = 'signal',
  initialRecoveryType = 'default',
}: InitialStateConfig): ComposeDiscoverState => ({
  mode,
  step: 0,
  tracking: initialKind === 'alert',
  recoveryType: initialKind === 'alert' ? initialRecoveryType : 'default',
  activeTab: 'alert',
  childOpen: mode === 'create',
  queryCommitted: mode === 'edit',
  yamlMode: false,
});

/**
 * Returns which default tab to activate for the Sandbox based on the tab config.
 */
function defaultTabForConfig(tabConfig: SandboxTabConfig): QueryTab {
  if (tabConfig.type === 'base-recovery') return 'recovery';
  if (tabConfig.type === 'base-alert') return 'alert';
  return 'alert';
}

/**
 * Returns the SandboxTabConfig for the current state.
 *
 * alertCondition    + tracking  → base-alert
 * recoveryCondition + custom    → base-recovery
 * everything else               → single
 */
export function getSandboxTabConfig(state: ComposeDiscoverState): SandboxTabConfig {
  if (!state.tracking) return { type: 'single' };

  const stepId = getStepIds(state.tracking)[state.step];

  if (stepId === 'alertCondition') return { type: 'base-alert' };
  if (stepId === 'recoveryCondition' && state.recoveryType === 'custom') {
    return { type: 'base-recovery' };
  }
  return { type: 'single' };
}

export function reducer(
  state: ComposeDiscoverState,
  action: ComposeDiscoverAction
): ComposeDiscoverState {
  switch (action.type) {
    case 'SET_RECOVERY_TYPE':
      return {
        ...state,
        recoveryType: action.recoveryType,
        ...(action.recoveryType === 'custom'
          ? { childOpen: true, activeTab: 'recovery' as const }
          : {}),
      };
    case 'ENABLE_TRACKING': {
      const stateWithTracking = { ...state, tracking: true };
      const tabConfig = getSandboxTabConfig({ ...stateWithTracking, step: 0 });
      return {
        ...state,
        tracking: true,
        step: 0,
        childOpen: true,
        activeTab: defaultTabForConfig(tabConfig),
      };
    }
    case 'DISABLE_TRACKING':
      return {
        ...state,
        tracking: false,
        recoveryType: 'default',
        step: 0,
        childOpen: false,
        activeTab: 'alert',
      };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'GO_NEXT': {
      const stepCount = getStepIds(state.tracking).length;
      const nextStep = Math.min(state.step + 1, stepCount - 1);
      return { ...state, step: nextStep, childOpen: false };
    }
    case 'GO_BACK': {
      const prevStep = Math.max(state.step - 1, 0);
      return { ...state, step: prevStep, childOpen: false };
    }
    case 'OPEN_CHILD': {
      const tabConfig = getSandboxTabConfig(state);
      return { ...state, childOpen: true, activeTab: defaultTabForConfig(tabConfig) };
    }
    case 'OPEN_CHILD_FOR_STEP': {
      const stateAtStep = { ...state, step: action.step };
      const tabConfig = getSandboxTabConfig(stateAtStep);
      return {
        ...state,
        step: action.step,
        childOpen: true,
        activeTab: defaultTabForConfig(tabConfig),
      };
    }
    case 'CLOSE_CHILD':
      return { ...state, childOpen: false };
    case 'COMMIT_QUERY':
      return {
        ...state,
        childOpen: state.yamlMode ? state.childOpen : false,
        queryCommitted: true,
      };
    case 'SET_YAML_MODE':
      return {
        ...state,
        yamlMode: action.enabled,
        childOpen: true,
      };
    default:
      return state;
  }
}

export const useComposeDiscoverState = (config: InitialStateConfig) => {
  return useReducer(reducer, undefined, () => createInitialState(config));
};
