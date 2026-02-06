/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DASHBOARD_EVENTS = {
  /** Emitted when a dashboard preview session is initialized */
  SESSION_CREATED: 'dashboard_session_created',
  /** Emitted when a panel is added to the dashboard preview */
  PANEL_ADDED: 'dashboard_panel_added',
  /** Emitted when the dashboard is finalized */
  FINALIZED: 'dashboard_finalized',
} as const;

export type DashboardEventType = (typeof DASHBOARD_EVENTS)[keyof typeof DASHBOARD_EVENTS];

export interface DashboardSessionCreatedData {
  title: string;
  description: string;
  markdownContent: string;
}

export interface DashboardPanelAddedData {
  panel: unknown;
}

export interface DashboardFinalizedData {
  dashboardId: string;
  url: string;
}
