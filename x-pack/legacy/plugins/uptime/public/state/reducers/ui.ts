/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionTypes, PopoverState, SET_INTEGRATION_POPOVER_STATE } from '../actions/ui';

export interface UiState {
  integrationsPopoverOpen: PopoverState | null;
}

const initialState: UiState = {
  integrationsPopoverOpen: null,
};

export function uiReducer(state = initialState, action: UiActionTypes): UiState {
  switch (action.type) {
    case SET_INTEGRATION_POPOVER_STATE:
      const popoverState = action.payload;
      return {
        ...state,
        integrationsPopoverOpen: {
          id: popoverState.id,
          open: popoverState.open,
        },
      };
    default:
      return state;
  }
}
