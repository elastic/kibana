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
 * Id of the built-in dashboards skill registered by the agent_builder_dashboards plugin.
 */
export const DASHBOARDS_SKILL_ID = 'dashboards';

/**
 * The skill reference in the chat input's serialized badge form. Both the input editor and the
 * conversation timeline render it as a `/dashboards` chip, and the agent treats it as an explicit
 * request to load the skill. A bare `/dashboards` prefix loads the skill too but renders as text.
 */
export const getDashboardsSkillBadge = (): string =>
  `[/${DASHBOARDS_SKILL_ID}](skill://${DASHBOARDS_SKILL_ID})`;
