/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_APP_ID } from '@kbn/deeplinks-analytics';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

/**
 * Switches a dashboard the user can edit in the Dashboard app to edit mode, so agent changes show
 * as unsaved. The dashboard API itself keeps managed dashboards in view mode.
 */
export const enterEditModeForAgentChanges = (api: DashboardApi): void => {
  if (api.isEditableByUser && api.getAppContext().currentAppId === DASHBOARD_APP_ID) {
    api.setViewMode('edit');
  }
};
