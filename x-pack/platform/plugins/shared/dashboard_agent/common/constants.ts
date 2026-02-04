/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag for enabling the dashboard agent
 */
export const DASHBOARD_AGENT_FEATURE_FLAG = 'dashboardAgent.enabled';
export const DASHBOARD_AGENT_FEATURE_FLAG_DEFAULT = false;

/**
 * Namespace for dashboard-related tools and agents
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
 * These tools are registered by the dashboard_agent plugin.
 */
export const dashboardTools = {
  manageDashboard: dashboardTool('manage_dashboard'),
} as const;
