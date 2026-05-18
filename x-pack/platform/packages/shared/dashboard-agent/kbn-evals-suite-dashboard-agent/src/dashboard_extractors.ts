/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type TaskOutput } from '@kbn/evals';

const MANAGE_DASHBOARD_TOOL_ID = 'platform.dashboard.manage_dashboard';

interface PanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Panel {
  type: string;
  panelId: string;
  title: string;
  grid: PanelGrid;
}

interface Section {
  sectionId: string;
  title: string;
  collapsed: boolean;
  grid: { y: number };
  panels: Panel[];
}

interface DashboardContent {
  title: string;
  description: string;
  panels: Panel[];
  sections?: Section[];
}

interface DashboardResult {
  version: number;
  failures?: Array<{ message: string }>;
  dashboardAttachment: {
    id: string;
    content: DashboardContent;
  };
}

/**
 * Extracts all dashboard tool call results from the converse output.
 */
export const extractDashboardResults = (output: TaskOutput): DashboardResult[] => {
  const toolCalls = getToolCallSteps(output);
  const dashboardCalls = toolCalls.filter((t) => t.tool_id === MANAGE_DASHBOARD_TOOL_ID);

  const results: DashboardResult[] = [];
  for (const call of dashboardCalls) {
    for (const result of call.results ?? []) {
      const r = result as { type?: string; data?: DashboardResult };
      if (r?.type === 'dashboard' && r.data?.dashboardAttachment?.content) {
        results.push(r.data);
      }
    }
  }
  return results;
};

/**
 * Returns the latest (last) dashboard result, representing the final dashboard state.
 */
export const getLatestDashboard = (output: TaskOutput): DashboardResult | undefined => {
  const results = extractDashboardResults(output);
  return results.length > 0 ? results[results.length - 1] : undefined;
};

/**
 * Collects all panels from top-level and all sections.
 */
export const getAllPanels = (content: DashboardContent): Panel[] => {
  const panels = [...content.panels];
  for (const section of content.sections ?? []) {
    panels.push(...section.panels);
  }
  return panels;
};

/**
 * Checks if any two panels in the given array overlap using AABB intersection.
 */
export const hasOverlappingPanels = (panels: Panel[]): boolean => {
  for (let i = 0; i < panels.length; i++) {
    for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i].grid;
      const b = panels[j].grid;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        return true;
      }
    }
  }
  return false;
};
