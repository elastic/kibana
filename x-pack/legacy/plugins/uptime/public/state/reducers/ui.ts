/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PopoverState,
  UiActionTypes,
  REFRESH_APP,
  SET_INTEGRATION_POPOVER_STATE,
  SET_BASE_PATH,
  SET_ES_KUERY_STRING,
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

export function uiReducer(state = initialState, action: UiActionTypes): UiState {
  switch (action.type) {
    case REFRESH_APP:
      return {
        ...state,
        lastRefresh: action.payload,
      };
    case SET_INTEGRATION_POPOVER_STATE:
      const popoverState = action.payload;
      return {
        ...state,
        integrationsPopoverOpen: {
          id: popoverState.id,
          open: popoverState.open,
        },
      };
    case SET_BASE_PATH:
      const basePath = action.payload;
      return {
        ...state,
        basePath,
      };
    case SET_ES_KUERY_STRING:
      return {
        ...state,
        esKuery: action.payload,
      };
    default:
      return state;
  }
}
