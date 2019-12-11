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

export const getFilters = ({ ui: { filters } }: AppState) => filters;

// Monitor Selectors
export const getMonitorDetails = (state: AppState, summary: any) =>
  state.monitor.monitorDetailsList[summary.monitor_id];
