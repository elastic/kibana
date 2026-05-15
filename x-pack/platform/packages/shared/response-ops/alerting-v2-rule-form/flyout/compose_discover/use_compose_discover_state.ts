/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import type {
  StepId,
  ComposeDiscoverState,
  ComposeDiscoverAction,
  ComposeDiscoverMode,
  QueryTab,
  SandboxTabConfig,
} from './types';
import { guessRecoveryBlock, splitQuery } from './use_heuristic_split';

export const getStepIds = (tracking: boolean): StepId[] =>
  tracking
    ? ['alertCondition', 'recoveryCondition', 'details', 'notifications']
    : ['alertCondition', 'details', 'notifications'];

export interface InitialStateConfig {
  mode: ComposeDiscoverMode;
  initialQuery?: string;
  /**
   * If the persisted rule had recovery_policy.type === 'query', pass the
   * full recovery query here. createInitialState will infer that tracking
   * was active and reconstruct the split state (base / alertBlock /
   * recoveryBlock) so the edit form opens in tracking mode.
   */
  initialRecoveryQuery?: string;
}

export const createInitialState = ({
  mode,
  initialQuery = '',
  initialRecoveryQuery,
}: InitialStateConfig): ComposeDiscoverState => {
  const base: ComposeDiscoverState = {
    mode,
    step: 0,
    tracking: false,
    fullQuery: initialQuery,
    baseQuery: '',
    alertBlock: '',
    recoveryBlock: '',
    recoveryType: 'default',
    activeTab: 'alert',
    childOpen: mode === 'create',
    queryCommitted: mode === 'edit',
    sandboxDateStart: 'now-15m',
    sandboxDateEnd: 'now',
    yamlMode: false,
  };

  if (!initialRecoveryQuery) return base;

  const evalSplit = splitQuery(initialQuery);
  const recoverySplit = splitQuery(initialRecoveryQuery);

  return {
    ...base,
    tracking: true,
    baseQuery: evalSplit.base,
    alertBlock: evalSplit.alertBlock,
    recoveryBlock: recoverySplit.alertBlock,
    recoveryType: 'custom',
  };
};

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
    case 'SET_FULL_QUERY':
      return { ...state, fullQuery: action.query };
    case 'SET_RECOVERY_TYPE': {
      const seedBlock =
        action.recoveryType === 'custom' && !state.recoveryBlock && state.alertBlock
          ? guessRecoveryBlock(state.alertBlock)
          : state.recoveryBlock;
      return {
        ...state,
        recoveryType: action.recoveryType,
        recoveryBlock: seedBlock,
        ...(action.recoveryType === 'custom'
          ? { childOpen: true, activeTab: 'recovery' as const }
          : {}),
      };
    }
    case 'ENABLE_TRACKING': {
      const stateWithTracking = { ...state, tracking: true };
      const tabConfig = getSandboxTabConfig({ ...stateWithTracking, step: 0 });
      return {
        ...state,
        tracking: true,
        baseQuery: action.base,
        alertBlock: action.alertBlock,
        step: 0,
        childOpen: false,
        activeTab: defaultTabForConfig(tabConfig),
      };
    }
    case 'DISABLE_TRACKING':
      return {
        ...state,
        tracking: false,
        fullQuery: [state.baseQuery, state.alertBlock].filter(Boolean).join('\n'),
        baseQuery: '',
        alertBlock: '',
        recoveryBlock: '',
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
    case 'SET_SANDBOX_DATE_RANGE':
      return { ...state, sandboxDateStart: action.start, sandboxDateEnd: action.end };
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
    case 'COMMIT_CHILD_QUERY':
      return {
        ...state,
        fullQuery: action.fullQuery,
        childOpen: state.yamlMode ? state.childOpen : false,
        queryCommitted: true,
      };
    case 'COMMIT_CHILD_SPLIT':
      return {
        ...state,
        baseQuery: action.baseQuery,
        alertBlock: action.alertBlock,
        recoveryBlock: action.recoveryBlock,
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
