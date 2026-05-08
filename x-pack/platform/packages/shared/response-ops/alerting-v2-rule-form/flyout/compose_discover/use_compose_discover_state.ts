/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  ComposeDiscoverMode,
  SandboxTabConfig,
} from './types';
import { guessRecoveryBlock } from './use_heuristic_split';

const SAMPLE_QUERY = `FROM logs-*
| STATS count = COUNT(*) BY host.name
| WHERE count > 0`;

const createInitialState = (mode: ComposeDiscoverMode): ComposeDiscoverState => ({
  mode,
  option: 'opt1',
  step: 0,
  tracking: false,
  fullQuery: mode === 'create' ? SAMPLE_QUERY : '',
  baseQuery: '',
  alertBlock: '',
  recoveryBlock: '',
  recoveryType: 'default',
  notificationsEnabled: false,
  name: '',
  tags: [],
  schedule: '1m',
  lookback: '5m',
  timeField: '@timestamp',
  groupFields: [],
  alertDelayMode: 'immediate',
  alertDelayValue: 1,
  recoveryDelayMode: 'immediate',
  recoveryDelayValue: 1,
  activeTab: 'alert',
  yamlMode: false,
  childOpen: mode === 'create',
  queryCommitted: mode === 'edit',
});

/**
 * Returns the ordered list of step titles for the current state.
 * Used for the stepper display and step routing in the form.
 */
export function getStepTitles(state: Pick<ComposeDiscoverState, 'option' | 'tracking'>): string[] {
  if (state.option === 'opt2') return ['Query Condition', 'Details & Artifacts', 'Notifications'];
  if (state.tracking)
    return ['Alert Condition', 'Recovery Condition', 'Details & Artifacts', 'Notifications'];
  return ['Alert Condition', 'Details & Artifacts', 'Notifications'];
}

/**
 * Returns the SandboxTabConfig for the current state — determines which tabs
 * the Discover Sandbox child flyout should display.
 */
export function getSandboxTabConfig(state: ComposeDiscoverState): SandboxTabConfig {
  if (state.yamlMode) return { type: 'all-three' };
  // opt2: single editor until query is committed, then full 3-tab view
  if (state.option === 'opt2') {
    return state.queryCommitted ? { type: 'all-three' } : { type: 'single' };
  }

  // opt1: tab config depends on the current step
  const stepTitles = getStepTitles(state);
  const currentStepName = stepTitles[state.step] ?? '';

  if (currentStepName === 'Recovery Condition' && state.recoveryType === 'custom') {
    return { type: 'base-recovery' };
  }
  if (
    (currentStepName === 'Alert Condition' || currentStepName === 'Query Condition') &&
    state.tracking
  ) {
    return { type: 'base-alert' };
  }
  return { type: 'single' };
}

function getDefaultTabForStep(
  state: ComposeDiscoverState,
  tabConfig: SandboxTabConfig
): ComposeDiscoverState['activeTab'] {
  if (tabConfig.type === 'base-recovery') return 'recovery';
  if (tabConfig.type === 'base-alert') return 'alert';
  return 'alert';
}

function reducer(
  state: ComposeDiscoverState,
  action: ComposeDiscoverAction
): ComposeDiscoverState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'SET_TAGS':
      return { ...state, tags: action.tags };
    case 'SET_FULL_QUERY':
      return { ...state, fullQuery: action.query };
    case 'SET_BASE_QUERY':
      return { ...state, baseQuery: action.query };
    case 'SET_ALERT_BLOCK':
      return { ...state, alertBlock: action.block };
    case 'SET_RECOVERY_BLOCK':
      return { ...state, recoveryBlock: action.block };
    case 'SET_RECOVERY_TYPE': {
      const newBlock =
        action.recoveryType === 'custom' && !state.recoveryBlock && state.alertBlock
          ? guessRecoveryBlock(state.alertBlock)
          : state.recoveryBlock;
      return {
        ...state,
        recoveryType: action.recoveryType,
        recoveryBlock: newBlock,
        // Open the sandbox on the recovery tab when custom recovery is selected
        ...(action.recoveryType === 'custom'
          ? { childOpen: true, activeTab: 'recovery' as const }
          : {}),
      };
    }
    case 'ENABLE_TRACKING': {
      // If currently on recovery step, jump back to step 0
      const steps = getStepTitles({ option: state.option, tracking: true });
      const clampedStep = state.step < steps.length ? state.step : 0;
      return {
        ...state,
        tracking: true,
        baseQuery: action.base,
        alertBlock: action.alertBlock,
        activeTab: 'alert',
        step: clampedStep,
      };
    }
    case 'DISABLE_TRACKING':
      return {
        ...state,
        tracking: false,
        step: 0,
        fullQuery: [state.baseQuery, state.alertBlock].filter(Boolean).join('\n'),
        baseQuery: '',
        alertBlock: '',
        recoveryBlock: '',
        recoveryType: 'default',
      };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_SCHEDULE':
      return { ...state, schedule: action.schedule };
    case 'SET_LOOKBACK':
      return { ...state, lookback: action.lookback };
    case 'SET_TIME_FIELD':
      return { ...state, timeField: action.timeField };
    case 'SET_GROUP_FIELDS':
      return { ...state, groupFields: action.fields };
    case 'SET_ALERT_DELAY_MODE':
      return { ...state, alertDelayMode: action.mode };
    case 'SET_ALERT_DELAY_VALUE':
      return { ...state, alertDelayValue: action.value };
    case 'SET_RECOVERY_DELAY_MODE':
      return { ...state, recoveryDelayMode: action.mode };
    case 'SET_RECOVERY_DELAY_VALUE':
      return { ...state, recoveryDelayValue: action.value };
    case 'SET_YAML_MODE':
      return {
        ...state,
        yamlMode: action.enabled,
        // YAML mode force-opens the Sandbox with all 3 tabs
        childOpen: action.enabled ? true : state.childOpen,
        activeTab: action.enabled ? 'base' : state.activeTab,
      };
    case 'SET_NOTIFICATIONS_ENABLED':
      return { ...state, notificationsEnabled: action.enabled };
    case 'SET_OPTION':
      return { ...state, option: action.option, step: 0 };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'GO_NEXT': {
      const steps = getStepTitles(state);
      const nextStep = Math.min(state.step + 1, steps.length - 1);
      return { ...state, step: nextStep, childOpen: false };
    }
    case 'GO_BACK': {
      const prevStep = Math.max(state.step - 1, 0);
      return { ...state, step: prevStep, childOpen: false };
    }
    case 'OPEN_CHILD': {
      const tabConfig = getSandboxTabConfig(state);
      return {
        ...state,
        childOpen: true,
        activeTab: getDefaultTabForStep(state, tabConfig),
      };
    }
    case 'OPEN_CHILD_FOR_STEP': {
      // Use provided step to compute the correct default tab
      const stateAtStep = { ...state, step: action.step };
      const tabConfig = getSandboxTabConfig(stateAtStep);
      return {
        ...state,
        step: action.step,
        childOpen: true,
        activeTab: getDefaultTabForStep(stateAtStep, tabConfig),
      };
    }
    case 'CLOSE_CHILD':
      return { ...state, childOpen: false };
    case 'COMMIT_CHILD_QUERY':
      return { ...state, fullQuery: action.fullQuery, childOpen: false, queryCommitted: true };
    case 'COMMIT_CHILD_SPLIT':
      return {
        ...state,
        baseQuery: action.baseQuery,
        alertBlock: action.alertBlock,
        recoveryBlock: action.recoveryBlock,
        childOpen: false,
        queryCommitted: true,
      };
    default:
      return state;
  }
}

export const useComposeDiscoverState = (mode: ComposeDiscoverMode = 'create') => {
  return useReducer(reducer, mode, createInitialState);
};
