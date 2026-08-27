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
  /** Dashboard chrome title is hidden (`config.hide_title`). */
  hide_title?: true;
  /** Primary metric `apply_color_to` when present. */
  apply_color_to?: string;
  /** Metric already has a secondary value. */
  has_secondary_metric?: true;
  /** Metric complementary viz (`trend` or `bar`). */
  background_chart?: string;
}

export interface ControlCatalogEntry {
  id: string;
  type: string;
  title?: string;
}

export interface SectionCatalogEntry {
  id: string;
  title: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

const primaryMetric = (config: AttachmentPanel['config']): Record<string, unknown> | undefined => {
  const metrics = config.metrics;
  if (!Array.isArray(metrics)) {
    return undefined;
  }
  for (const item of metrics) {
    if (isRecord(item) && item.type === 'primary') {
      return item;
    }
  }
  const first = metrics[0];
  return isRecord(first) ? first : undefined;
};

const toEntry = (panel: AttachmentPanel, sectionId?: string): PanelCatalogEntry => {
  const chartType = panelChartType(panel);
  const esql = panelEsql(panel);
  const primary = primaryMetric(panel.config);
  const applyColorTo =
    typeof primary?.apply_color_to === 'string' ? primary.apply_color_to : undefined;
  const background =
    primary && isRecord(primary.background_chart) ? primary.background_chart : undefined;
  const backgroundChart =
    background && typeof background.type === 'string' ? background.type : undefined;
  const hasSecondary =
    Array.isArray(panel.config.metrics) &&
    panel.config.metrics.some((item) => isRecord(item) && item.type === 'secondary');
  return {
    id: panel.id,
    type: panel.type,
    title: panelTitle(panel),
    ...(chartType ? { chart_type: chartType } : {}),
    ...(esql ? { esql } : {}),
    grid: panel.grid,
    ...(sectionId ? { section_id: sectionId } : {}),
    ...(panel.config.hide_title === true ? { hide_title: true } : {}),
    ...(applyColorTo ? { apply_color_to: applyColorTo } : {}),
    ...(hasSecondary ? { has_secondary_metric: true } : {}),
    ...(backgroundChart ? { background_chart: backgroundChart } : {}),
  };
};

/**
 * Compact panel list for Dashboard Review: ids, titles, grid, chart type, and ES|QL.
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

export const catalogDashboardSections = (data: DashboardAttachmentData): SectionCatalogEntry[] =>
  data.panels.filter(isSection).map((section) => ({ id: section.id, title: section.title }));

export const catalogDashboardControls = (data: DashboardAttachmentData): ControlCatalogEntry[] => {
  const entries: ControlCatalogEntry[] = [];
  for (const raw of data.pinned_panels ?? []) {
    const id = typeof raw.id === 'string' ? raw.id : undefined;
    const type = typeof raw.type === 'string' ? raw.type : undefined;
    if (!id || !type) {
      continue;
    }
    const config = raw.config;
    const titleValue =
      config && typeof config === 'object' && !Array.isArray(config) && 'title' in config
        ? config.title
        : undefined;
    const title = typeof titleValue === 'string' && titleValue.length > 0 ? titleValue : undefined;
    entries.push({ id, type, ...(title ? { title } : {}) });
  }
  return entries;
};
