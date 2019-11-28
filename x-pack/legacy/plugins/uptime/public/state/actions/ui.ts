/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SET_INTEGRATION_POPOVER_STATE = 'SET_INTEGRATION_POPOVER_STATE';
export const SET_BASE_PATH = 'SET_BASE_PATH';
export const REFRESH_APP = 'REFRESH_APP';

export interface PopoverState {
  id: string;
  open: boolean;
}

interface SetBasePathAction {
  type: typeof SET_BASE_PATH;
  payload: string;
}

interface SetIntegrationPopoverAction {
  type: typeof SET_INTEGRATION_POPOVER_STATE;
  payload: PopoverState;
}

interface TriggerAppRefreshAction {
  type: typeof REFRESH_APP;
  payload: number;
}

export type UiActionTypes =
  | SetIntegrationPopoverAction
  | SetBasePathAction
  | TriggerAppRefreshAction;

export function toggleIntegrationsPopover(popoverState: PopoverState): SetIntegrationPopoverAction {
  return {
    type: SET_INTEGRATION_POPOVER_STATE,
    payload: popoverState,
  };
}

export function setBasePath(basePath: string): SetBasePathAction {
  return {
    type: SET_BASE_PATH,
    payload: basePath,
  };
}

export function triggerAppRefresh(refreshTime: number): TriggerAppRefreshAction {
  return {
    type: REFRESH_APP,
    payload: refreshTime,
  };
}
