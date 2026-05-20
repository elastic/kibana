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
  RecoveryType,
} from './types';

export const getStepIds = (isAlert: boolean): StepId[] =>
  isAlert
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
  recoveryType: initialKind === 'alert' ? initialRecoveryType : 'default',
  activeTab: 'alert',
  childOpen: mode === 'create',
  queryCommitted: mode === 'edit',
  yamlMode: false,
});

/**
 * Returns the tabs to show in the Sandbox for the current step.
 *
 * isAlert + alertCondition     → ['base', 'alert']
 * isAlert + recoveryCondition  + custom → ['recovery']
 * everything else              → undefined (single editor)
 */
export function getSandboxTabs(
  isAlert: boolean,
  state: Pick<ComposeDiscoverState, 'step' | 'recoveryType'>
): QueryTab[] | undefined {
  if (!isAlert) return undefined;

  const stepId = getStepIds(isAlert)[state.step];

  if (stepId === 'alertCondition') return ['base', 'alert'];
  if (stepId === 'recoveryCondition' && state.recoveryType === 'custom') return ['recovery'];
  return undefined;
}

function defaultTabForTabs(tabs: QueryTab[] | undefined): QueryTab {
  if (tabs?.includes('recovery')) return 'recovery';
  return 'alert';
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
    case 'TRACKING_ENABLED':
      return { ...state, step: 0, childOpen: true, activeTab: 'alert' };
    case 'TRACKING_DISABLED':
      return { ...state, recoveryType: 'default', step: 0, activeTab: 'alert' };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'GO_NEXT': {
      const stepCount = getStepIds(action.isAlert).length;
      const nextStep = Math.min(state.step + 1, stepCount - 1);
      return { ...state, step: nextStep, childOpen: false };
    }
    case 'GO_BACK': {
      const prevStep = Math.max(state.step - 1, 0);
      return { ...state, step: prevStep, childOpen: false };
    }
    case 'OPEN_CHILD':
      return {
        ...state,
        childOpen: true,
        activeTab: defaultTabForTabs(getSandboxTabs(action.isAlert, state)),
      };
    case 'OPEN_CHILD_FOR_STEP': {
      const stateAtStep = { ...state, step: action.step };
      return {
        ...state,
        step: action.step,
        childOpen: true,
        activeTab: defaultTabForTabs(getSandboxTabs(action.isAlert, stateAtStep)),
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
