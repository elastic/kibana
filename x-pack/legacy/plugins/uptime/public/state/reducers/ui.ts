/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionTypes, TOGGLE_INTEGRATION_POPUP } from '../actions/ui';

export interface UiState {
  integrationsPopupOpen: boolean;
}

const initialState: UiState = {
  integrationsPopupOpen: false,
};

export function uiReducer(state = initialState, action: UiActionTypes): UiState {
  switch (action.type) {
    case TOGGLE_INTEGRATION_POPUP:
      return {
        ...state,
        integrationsPopupOpen: !state.integrationsPopupOpen,
      };
    default:
      return state;
  }
}
