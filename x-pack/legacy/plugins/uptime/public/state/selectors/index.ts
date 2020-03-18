/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { AppState } from '../../state';

export const mlSelector = (state: AppState) => state.ml;

// UI Selectors
export const getBasePath = ({ ui: { basePath } }: AppState) => basePath;

export const isIntegrationsPopupOpen = ({ ui: { integrationsPopoverOpen } }: AppState) =>
  integrationsPopoverOpen;

// Monitor Selectors
export const getMonitorDetails = (state: AppState, summary: any) =>
  state.monitor.monitorDetailsList[summary.monitor_id];

export const selectMonitorLocations = (state: AppState, monitorId: string) =>
  state.monitor.monitorLocationsList?.get(monitorId);

export const selectSelectedMonitor = (state: AppState) => state.monitorStatus.monitor;

export const selectMonitorStatus = (state: AppState) => state.monitorStatus.status;

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

export const hasMLJobSelector = (state: AppState) => state.ml.mlJob;

export const hasNewMLJobSelector = createSelector(mlSelector, ml => ml.createJob.data?.count > 0);

export const isMLJobCreatingSelector = createSelector(mlSelector, ml => ml.createJob.loading);

export const isMLJobDeletingSelector = createSelector(mlSelector, ml => ml.deleteJob.loading);

export const isMLJobDeletedSelector = createSelector(mlSelector, ml => ml.deleteJob);

export const anomaliesSelector = createSelector(mlSelector, ml => ml.anomalies.data);

export const selectDurationLines = ({ monitorDuration }: AppState) => {
  return monitorDuration;
};

export const indexStatusSelector = ({ indexStatus }: AppState) => {
  return indexStatus;
};
