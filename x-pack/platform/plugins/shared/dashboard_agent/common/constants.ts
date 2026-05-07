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
export const DASHBOARD_SCREENSHOT_APP_ID = 'dashboard_agent_screenshot';
export const DASHBOARD_SCREENSHOT_CONTEXT_KEY = 'dashboardAttachmentData';

/**
 * Helper function to create tool IDs in the dashboard namespace
 */
const dashboardTool = (toolName: string) => {
  return `${DASHBOARD_NAMESPACE}.${toolName}`;
};

/**
 * Ids of built-in dashboard tools.
 * These tools are registered by the dashboard_agent plugin.
 */
export const dashboardTools = {
  manageDashboard: dashboardTool('manage_dashboard'),
  inspectDashboard: dashboardTool('inspect_dashboard'),
} as const;
