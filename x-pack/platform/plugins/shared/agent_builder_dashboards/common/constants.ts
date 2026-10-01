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
  panelToVisualization: dashboardTool('panel_to_visualization'),
} as const;

/**
 * Id of the built-in dashboard management skill registered by the agent_builder_dashboards plugin.
 */
export const DASHBOARD_MANAGEMENT_SKILL_ID = 'dashboard-management';

/**
 * Name shown to users when the dashboard skill is referenced in the chat input, e.g. `/dashboards`.
 */
export const DASHBOARD_SKILL_DISPLAY_NAME = 'dashboards';

/**
 * Skill badge in the chat input's serialized form: the label is what the user sees, the path is
 * the skill id that gets loaded. Both the input editor and the conversation timeline render it as
 * a badge, and the agent treats it as an explicit request to load the skill.
 */
export const getDashboardSkillBadge = (): string =>
  `[/${DASHBOARD_SKILL_DISPLAY_NAME}](skill://${DASHBOARD_MANAGEMENT_SKILL_ID})`;
