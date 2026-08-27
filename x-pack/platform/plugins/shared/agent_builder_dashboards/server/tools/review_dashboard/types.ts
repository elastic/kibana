/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type {
  ControlCatalogEntry,
  PanelCatalogEntry,
  SectionCatalogEntry,
} from './catalog_dashboard_panels';

export type { ControlCatalogEntry, PanelCatalogEntry, SectionCatalogEntry };

export interface DashboardImage {
  bytes: Buffer;
  mimeType: string;
}

export interface PanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PackLayoutPanelFix {
  panel_id: string;
  grid: PanelGrid;
  section_id?: string | null;
}

export interface PackLayoutFinding {
  rule: 'pack_layout';
  what: string;
  fix: { panels: PackLayoutPanelFix[] };
}

export interface WeakSectionsFinding {
  rule: 'weak_sections';
  what: string;
  fix: { sections: Array<{ id: string; title: string; panel_ids: string[] }> };
}

export interface MonotoneChartTypesFinding {
  rule: 'monotone_chart_types';
  what: string;
  fix: { changes: Array<{ panel_id: string; chartType: string }> };
}

export interface WrongChartTypeFinding {
  rule: 'wrong_chart_type';
  panel_id: string;
  what: string;
  fix: { chartType: string };
}

export interface DuplicateInnerTitleFinding {
  rule: 'duplicate_inner_title';
  panel_id: string;
  what: string;
  fix: { hide_title: true };
}

export interface OneCategoryChartFinding {
  rule: 'one_category_chart';
  panel_id: string;
  what: string;
  fix: { chartType: string };
}

export interface MetricFillFinding {
  rule: 'metric_fill';
  panel_id: string;
  what: string;
  fix: { clear_background: true };
}

export interface ThinMetricFinding {
  rule: 'thin_metric';
  panel_id: string;
  what: string;
  fix: { enhance: 'trendline' };
}

export interface WeakControlsFinding {
  rule: 'weak_controls';
  what: string;
  fix: {
    add: Array<{
      type: 'options_list_control';
      field_name: string;
      index: string;
      title?: string;
    }>;
  };
}

export type DashboardFinding =
  | PackLayoutFinding
  | WeakSectionsFinding
  | MonotoneChartTypesFinding
  | WrongChartTypeFinding
  | DuplicateInnerTitleFinding
  | OneCategoryChartFinding
  | MetricFillFinding
  | ThinMetricFinding
  | WeakControlsFinding;

export type InspectDashboardImage = (args: {
  dashboard: DashboardAttachmentData;
  image: DashboardImage;
  modelProvider: ModelProvider;
}) => Promise<DashboardFinding[]>;
