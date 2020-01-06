/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppState } from '../../state';

// UI Selectors
export const getBasePath = ({ ui: { basePath } }: AppState) => basePath;

export const isIntegrationsPopupOpen = ({ ui: { integrationsPopoverOpen } }: AppState) =>
  integrationsPopoverOpen;

// Monitor Selectors
export const getMonitorDetails = (state: AppState, summary: any) => {
  return state.monitor.monitorDetailsList[summary.monitor_id];
};

export const getMonitorLocations = (state: AppState, monitorId: string) => {
  return state.monitor.monitorLocationsList?.get(monitorId);
};
