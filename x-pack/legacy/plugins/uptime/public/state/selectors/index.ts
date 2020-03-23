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
export const monitorDetailsSelector = (state: AppState, summary: any) => {
  return state.monitor.monitorDetailsList[summary.monitor_id];
};

export const monitorLocationsSelector = (state: AppState, monitorId: string) => {
  return state.monitor.monitorLocationsList?.get(monitorId);
};

export const selectSelectedMonitor = (state: AppState) => {
  return state.monitorStatus.monitor;
};

export const selectMonitorStatus = (state: AppState) => {
  return state.monitorStatus.status;
};

export const selectDynamicSettings = (state: AppState) => {
  return state.dynamicSettings;
};

export const selectIndexPattern = ({ indexPattern }: AppState) => {
  return { indexPattern: indexPattern.index_pattern, loading: indexPattern.loading };
};

export const selectPingHistogram = ({ ping, ui }: AppState) => {
  return {
    data: ping.pingHistogram,
    loading: ping.loading,
    lastRefresh: ui.lastRefresh,
    esKuery: ui.esKuery,
  };
};

export const selectDurationLines = ({ monitorDuration }: AppState) => {
  return monitorDuration;
};

export const selectAlertFlyoutVisibility = ({ ui: { alertFlyoutVisible } }: AppState) =>
  alertFlyoutVisible;

export const selectMonitorStatusAlert = ({ indexPattern, overviewFilters, ui }: AppState) => ({
  filters: ui.esKuery,
  indexPattern: indexPattern.index_pattern,
  locations: overviewFilters.filters.locations,
});

export const indexStatusSelector = ({ indexStatus }: AppState) => {
  return indexStatus;
};
