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

export const selectMonitorLocations = (state: AppState, monitorId: string) => {
  return state.monitor.monitorLocationsList?.get(monitorId);
};

export const selectSelectedMonitor = (state: AppState) => {
  return state.monitorStatus.monitor;
};

export const selectMonitorStatus = (state: AppState) => {
  return state.monitorStatus.status;
};

export const selectIndexPattern = ({ indexPattern }: AppState) => {
  return indexPattern.index_pattern;
};

export const selectPingHistogram = ({ ping, ui }: AppState) => {
  return { data: ping.pingHistogram, loading: ping.loading, lastRefresh: ui.lastRefresh };
};
