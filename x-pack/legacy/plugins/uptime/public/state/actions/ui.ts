/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TOGGLE_INTEGRATION_POPUP = 'TOGGLE_INTEGRATION_POPUP';

interface ToggleIntegrationPopupAction {
  type: typeof TOGGLE_INTEGRATION_POPUP;
  payload: boolean;
}

export function sendMessage(open: boolean): ToggleIntegrationPopupAction {
  return {
    type: TOGGLE_INTEGRATION_POPUP,
    payload: open,
  };
}

export type UiActionTypes = ToggleIntegrationPopupAction;
