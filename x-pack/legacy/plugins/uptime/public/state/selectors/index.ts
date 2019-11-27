/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppState } from '../../state';

export const isIntegrationsPopupOpen = (state: AppState) => state.ui.integrationsPopoverOpen;

export const getBasePath = (state: AppState) => state.ui.basePath;

export const getMonitorDetails = (state: AppState, summary: any) => {
  return state.monitor.monitorDetailsList[summary.monitor_id];
};
