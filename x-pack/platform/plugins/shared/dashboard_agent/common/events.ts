/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_NAMESPACE } from './constants';

/**
 * Dashboard UI event names
 */
export const DASHBOARD_EVENTS = {
  SESSION_CREATED: `${DASHBOARD_NAMESPACE}.session_created`,
  PANEL_ADDED: `${DASHBOARD_NAMESPACE}.panel_added`,
  FINALIZED: `${DASHBOARD_NAMESPACE}.finalized`,
} as const;

/**
 * Data emitted when a dashboard session is created
 */
export interface DashboardSessionCreatedData {
  title: string;
  description: string;
  markdownContent: string;
}

/**
 * Data emitted when a panel is added to the dashboard
 */
export interface DashboardPanelAddedData {
  panel: object;
}

/**
 * Data emitted when the dashboard is finalized
 */
export interface DashboardFinalizedData {
  dashboardId: string;
  url: string;
}
