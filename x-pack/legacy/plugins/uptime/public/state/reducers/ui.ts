/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import {
  PopoverState,
  toggleIntegrationsPopover,
  setBasePath,
  triggerAppRefresh,
  setFilters,
  UiPayload,
} from '../actions/ui';

export interface UiState {
  integrationsPopoverOpen: PopoverState | null;
  basePath: string;
  lastRefresh: number;
  filters: Map<string, string[]>;
}

const initialState: UiState = {
  integrationsPopoverOpen: null,
  basePath: '',
  lastRefresh: Date.now(),
  filters: new Map(),
};

export const uiReducer = handleActions<UiState, UiPayload>(
  {
    [String(toggleIntegrationsPopover)]: (state, action: Action<PopoverState>) => ({
      ...state,
      integrationsPopoverOpen: action.payload as PopoverState,
    }),

    [String(setBasePath)]: (state, action: Action<string>) => ({
      ...state,
      basePath: action.payload as string,
    }),

    [String(triggerAppRefresh)]: (state, action: Action<number>) => ({
      ...state,
      lastRefresh: action.payload as number,
    }),

    [String(setFilters)]: (state, action: Action<Map<string, string[]>>) => ({
      ...state,
      filters: new Map([...state.filters, ...(action.payload as Map<string, string[]>)]),
    }),
  },
  initialState
);
