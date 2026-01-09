/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Namespace for dashboard-related tools, agents, and attachments
 */
export const DASHBOARD_NAMESPACE = 'platform.dashboard';

/**
 * Dashboard agent ID
 */
export const DASHBOARD_AGENT_ID = `${DASHBOARD_NAMESPACE}.dashboard_agent`;

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
  createDashboard: dashboardTool('create_dashboard'),
  updateDashboard: dashboardTool('update_dashboard'),
} as const;

/**
 * Helper function to create attachment type IDs in the dashboard namespace
 */
const dashboardAttachment = (attachmentName: string) => {
  return `${DASHBOARD_NAMESPACE}.${attachmentName}`;
};

/**
 * Ids of built-in dashboard attachment types.
 * These attachment types are registered by the dashboard_agent plugin.
 */
export const dashboardAttachments = {
  dashboard: dashboardAttachment('dashboard'),
} as const;
