/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const GET_MONITOR_DETAILS = 'GET_MONITOR_DETAILS';

export interface MonitorState {
  id: string;
  open: boolean;
}

interface SetIntegrationPopoverAction {
  type: typeof GET_MONITOR_DETAILS;
  payload: MonitorState;
}

export function toggleIntegrationsPopover(popoverState: MonitorState): SetIntegrationPopoverAction {
  return {
    type: GET_MONITOR_DETAILS,
    payload: popoverState,
  };
}

export type UiActionTypes = SetIntegrationPopoverAction;
