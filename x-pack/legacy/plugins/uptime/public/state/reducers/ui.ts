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
  setEsKueryString,
  triggerAppRefresh,
  UiPayload,
} from '../actions/ui';

export interface UiState {
  integrationsPopoverOpen: PopoverState | null;
  basePath: string;
  esKuery: string;
  lastRefresh: number;
}

const initialState: UiState = {
  integrationsPopoverOpen: null,
  basePath: '',
  esKuery: '',
  lastRefresh: Date.now(),
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

    [String(setEsKueryString)]: (state, action: Action<string>) => ({
      ...state,
      esKuery: action.payload as string,
    }),
  },
  initialState
);
