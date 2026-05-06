/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import type { ComposeDiscoverState, ComposeDiscoverAction, ComposeDiscoverMode } from './types';

const SAMPLE_QUERY = `FROM logs-*
| STATS count = COUNT(*) BY host.name
| WHERE count > 0`;

const createInitialState = (mode: ComposeDiscoverMode): ComposeDiscoverState => ({
  mode,
  tracking: false,
  fullQuery: mode === 'create' ? SAMPLE_QUERY : '',
  baseQuery: '',
  alertBlock: '',
  recoveryBlock: '',
  recoveryMode: 'default',
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
    case 'SET_RECOVERY_MODE':
      return { ...state, recoveryMode: action.mode };
    case 'ENABLE_TRACKING':
      return {
        ...state,
        tracking: true,
        baseQuery: action.base,
        alertBlock: action.alertBlock,
        activeTab: 'alert',
      };
    case 'DISABLE_TRACKING':
      return {
        ...state,
        tracking: false,
        fullQuery: [state.baseQuery, state.alertBlock].filter(Boolean).join('\n'),
        baseQuery: '',
        alertBlock: '',
        recoveryBlock: '',
        recoveryMode: 'default',
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
      return { ...state, yamlMode: action.enabled };
    case 'OPEN_CHILD':
      return { ...state, childOpen: true };
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
