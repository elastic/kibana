/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiActionTypes,
  PopoverState,
  SET_INTEGRATION_POPOVER_STATE,
  SET_BASE_PATH,
  REFRESH_APP,
} from '../actions/ui';

export interface UiState {
  integrationsPopoverOpen: PopoverState | null;
  basePath: string;
  lastRefresh: number;
}

const initialState: UiState = {
  integrationsPopoverOpen: null,
  basePath: '',
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
    default:
      return state;
  }
}
