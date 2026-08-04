/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Namespace for dashboard-related tools
 */
export const DASHBOARD_NAMESPACE = 'platform.dashboard';

/**
 * Helper function to create tool IDs in the dashboard namespace
 */
const dashboardTool = (toolName: string) => {
  return `${DASHBOARD_NAMESPACE}.${toolName}`;
};

/**
 * Ids of built-in dashboard tools.
 * These tools are registered by the agent_builder_dashboards plugin.
 */
export const dashboardTools = {
  generateDashboard: dashboardTool('generate_dashboard'),
} as const;

/**
 * `tool_ui` custom event name emitted by {@link dashboardTools.generateDashboard}
 * after a draft or persisted dashboard payload is ready. The dashboard app listens
 * and applies the payload to the live UI so a mid-round screenshot can see the new state.
 */
export const DASHBOARD_APPLY_UI_EVENT = 'dashboard_apply' as const;

export interface DashboardApplyUiEventData {
  /** Draft or persisted attachment id associated with this apply. */
  attachment_id: string;
  /** Full dashboard attachment payload (same shape as the attachment data). */
  data: Record<string, unknown>;
}
