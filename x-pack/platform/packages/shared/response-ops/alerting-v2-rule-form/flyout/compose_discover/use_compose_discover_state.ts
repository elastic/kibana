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

const createInitialState = (
  mode: ComposeDiscoverMode,
  initialSandboxQuery = ''
): ComposeDiscoverState => ({
  mode,
  step: 0,
  sandbox: { query: initialSandboxQuery },
  activeTab: 'alert',
  childOpen: mode === 'create',
  queryCommitted: mode === 'edit',
  sandboxDateStart: 'now-15m',
  sandboxDateEnd: 'now',
});

/**
 * Returns the ordered list of step titles. Always 3 steps for PR B.
 * Tracking / Recovery Condition step added in the custom recovery follow-up.
 */
export function getStepTitles(): string[] {
  return ['Alert Condition', 'Details & Artifacts', 'Notifications'];
}

/**
 * Returns the SandboxTabConfig for the current state.
 * Always single for now — tabs (Base/Alert/Recovery) added in custom recovery follow-up.
 */
export function getSandboxTabConfig(_state: ComposeDiscoverState): SandboxTabConfig {
  return { type: 'single' };
}

function reducer(state: ComposeDiscoverState, action: ComposeDiscoverAction): ComposeDiscoverState {
  switch (action.type) {
    case 'SET_SANDBOX_QUERY':
      return { ...state, sandbox: { ...state.sandbox, query: action.query } };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'GO_NEXT': {
      const steps = getStepTitles();
      const nextStep = Math.min(state.step + 1, steps.length - 1);
      return { ...state, step: nextStep, childOpen: false };
    }
    case 'GO_BACK': {
      const prevStep = Math.max(state.step - 1, 0);
      return { ...state, step: prevStep, childOpen: false };
    }
    case 'SET_SANDBOX_DATE_RANGE':
      return { ...state, sandboxDateStart: action.start, sandboxDateEnd: action.end };
    case 'OPEN_CHILD':
      return { ...state, childOpen: true };
    case 'OPEN_CHILD_FOR_STEP':
      return { ...state, step: action.step, childOpen: true };
    case 'CLOSE_CHILD':
      return { ...state, childOpen: false };
    case 'COMMIT_SANDBOX_QUERY':
      return {
        ...state,
        sandbox: { ...state.sandbox, query: action.query },
        childOpen: false,
        queryCommitted: true,
      };
    default:
      return state;
  }
}

export const useComposeDiscoverState = (
  mode: ComposeDiscoverMode = 'create',
  initialSandboxQuery = ''
) => {
  return useReducer(reducer, undefined, () => createInitialState(mode, initialSandboxQuery));
};
