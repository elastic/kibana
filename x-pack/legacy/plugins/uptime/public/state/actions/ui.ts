/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SET_INTEGRATION_POPOVER_STATE = 'SET_INTEGRATION_POPOVER_STATE';

export interface PopoverState {
  id: string;
  open: boolean;
}

interface SetIntegrationPopoverAction {
  type: typeof SET_INTEGRATION_POPOVER_STATE;
  payload: PopoverState;
}

export function toggleIntegrationsPopover(popoverState: PopoverState): SetIntegrationPopoverAction {
  return {
    type: SET_INTEGRATION_POPOVER_STATE,
    payload: popoverState,
  };
}

export type UiActionTypes = SetIntegrationPopoverAction;
