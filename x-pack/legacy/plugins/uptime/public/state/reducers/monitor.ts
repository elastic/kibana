/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionTypes, MonitorState, GET_MONITOR_DETAILS } from '../actions/monitor';

export interface UiState {
  integrationsPopoverOpen: MonitorState | null;
}

const initialState: UiState = {
  integrationsPopoverOpen: null,
};

export function uiReducer(state = initialState, action: UiActionTypes): UiState {
  switch (action.type) {
    case GET_MONITOR_DETAILS:
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
