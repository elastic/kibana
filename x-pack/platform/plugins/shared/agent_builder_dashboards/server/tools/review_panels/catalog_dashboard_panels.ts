/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type DashboardAttachmentData,
  type AttachmentPanel,
} from '@kbn/agent-builder-dashboards-common';

export interface PanelCatalogEntry {
  id: string;
  type: string;
  title?: string;
  /** Lens chart family from `config.type` when present (e.g. `data_table`). */
  chart_type?: string;
  /** ES|QL from `config.data_source` when the panel is query-backed. */
  esql?: string;
  grid: AttachmentPanel['grid'];
  section_id?: string;
}

const panelTitle = (panel: AttachmentPanel): string | undefined => {
  const title = panel.config.title;
  return typeof title === 'string' && title.length > 0 ? title : undefined;
};

const panelChartType = (panel: AttachmentPanel): string | undefined => {
  const chartType = panel.config.type;
  return typeof chartType === 'string' && chartType.length > 0 ? chartType : undefined;
};

const panelEsql = (panel: AttachmentPanel): string | undefined => {
  const dataSource = panel.config.data_source;
  if (!dataSource || typeof dataSource !== 'object' || Array.isArray(dataSource)) {
    return undefined;
  }
  const { type, query } = dataSource as { type?: unknown; query?: unknown };
  if (type !== 'esql' || typeof query !== 'string' || query.length === 0) {
    return undefined;
  }
  return query;
};

const toEntry = (panel: AttachmentPanel, sectionId?: string): PanelCatalogEntry => {
  const chartType = panelChartType(panel);
  const esql = panelEsql(panel);
  return {
    id: panel.id,
    type: panel.type,
    title: panelTitle(panel),
    ...(chartType ? { chart_type: chartType } : {}),
    ...(esql ? { esql } : {}),
    grid: panel.grid,
    ...(sectionId ? { section_id: sectionId } : {}),
  };
};

/**
 * Compact panel list for Panel Review: ids, titles, grid, chart type, and ES|QL.
 */
export const catalogDashboardPanels = (data: DashboardAttachmentData): PanelCatalogEntry[] => {
  const entries: PanelCatalogEntry[] = [];
  for (const widget of data.panels) {
    if (isSection(widget)) {
      for (const panel of widget.panels) {
        entries.push(toEntry(panel, widget.id));
      }
    } else {
      entries.push(toEntry(widget));
    }
  }
  return entries;
};
