/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export interface DashboardPanelSummary {
  type: string;
  id: string;
  grid: AttachmentPanel['grid'];
  chart_type?: string;
  authoring_note?: string;
}

export interface DashboardSectionSummary {
  id: string;
  title: string;
  collapsed: boolean;
  grid: { y: number };
  panels: DashboardPanelSummary[];
}

export interface DashboardControlSummary {
  id?: string;
  type?: string;
  title?: string;
  esql_query?: string;
}

export interface DashboardSummary {
  title: string;
  description?: string;
  panels: Array<DashboardPanelSummary | DashboardSectionSummary>;
  controls: DashboardControlSummary[];
}

const getPanelChartType = (panel: AttachmentPanel): string | undefined => {
  const chartType = panel.config.type;
  return typeof chartType === 'string' ? chartType : undefined;
};

const summarizePanel = (
  panel: AttachmentPanel,
  authoringNotesByPanelId: Map<string, string>
): DashboardPanelSummary => {
  const chartType = getPanelChartType(panel);
  const authoringNote = authoringNotesByPanelId.get(panel.id);
  return {
    type: panel.type,
    id: panel.id,
    grid: panel.grid,
    ...(chartType ? { chart_type: chartType } : {}),
    ...(authoringNote ? { authoring_note: authoringNote } : {}),
  };
};

/**
 * Compact projection of a dashboard payload for the LLM and the review judge.
 * The full payload stays on the attachment.
 */
export const summarizeDashboard = (
  dashboardData: DashboardAttachmentData,
  authoringNotesByPanelId: Map<string, string>
): DashboardSummary => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map((panel) => summarizePanel(panel, authoringNotesByPanelId)),
      };
    }
    return summarizePanel(widget, authoringNotesByPanelId);
  }),
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as {
      id?: string;
      type?: string;
      config?: { title?: string; esql_query?: string };
    };
    return {
      id: c.id,
      type: c.type,
      title: c.config?.title,
      esql_query: c.config?.esql_query,
    };
  }),
});
