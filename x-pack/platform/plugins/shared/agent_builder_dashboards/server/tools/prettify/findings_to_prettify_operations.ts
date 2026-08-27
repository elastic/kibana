/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { DashboardFinding } from '../review_dashboard/types';
import type { DashboardOperation } from '../generate/core';

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

const isSupportedChartType = (value: string): value is SupportedChartType =>
  SUPPORTED_CHART_TYPES.has(value);

const chartTypeQuery = (chartType: SupportedChartType): string =>
  `Switch this visualization to ${chartType}. Keep the existing query, metrics, and colors.`;

type LayoutPanel = Extract<
  DashboardOperation,
  { operation: 'update_panel_layouts' }
>['panels'][number];

type EditPanel = Extract<DashboardOperation, { operation: 'edit_panels' }>['panels'][number];

const layoutPanel = (panelId: string): LayoutPanel => ({ panelId });

export const findingsToPrettifyOperations = (
  findings: DashboardFinding[]
): DashboardOperation[] => {
  const operations: DashboardOperation[] = [];
  const layoutsById = new Map<string, LayoutPanel>();

  const weakSections = findings.find((finding) => finding.rule === 'weak_sections');
  if (weakSections) {
    weakSections.fix.sections.forEach((section, index) => {
      operations.push({
        operation: 'add_section',
        id: section.id,
        title: section.title,
        grid: { y: index },
      });
    });
  }

  const pack = findings.find((finding) => finding.rule === 'pack_layout');
  if (pack) {
    for (const panel of pack.fix.panels) {
      layoutsById.set(panel.panel_id, {
        panelId: panel.panel_id,
        grid: panel.grid,
        ...(panel.section_id === undefined ? {} : { sectionId: panel.section_id }),
      });
    }
  }

  for (const finding of findings) {
    if (finding.rule === 'duplicate_inner_title') {
      const next = layoutsById.get(finding.panel_id) ?? layoutPanel(finding.panel_id);
      next.hide_title = true;
      layoutsById.set(finding.panel_id, next);
    }
    if (finding.rule === 'metric_fill') {
      const next = layoutsById.get(finding.panel_id) ?? layoutPanel(finding.panel_id);
      next.clear_metric_fill = true;
      layoutsById.set(finding.panel_id, next);
    }
    if (finding.rule === 'thin_metric') {
      const next = layoutsById.get(finding.panel_id) ?? layoutPanel(finding.panel_id);
      next.metric_trendline = true;
      layoutsById.set(finding.panel_id, next);
    }
  }

  if (layoutsById.size > 0) {
    operations.push({
      operation: 'update_panel_layouts',
      panels: [...layoutsById.values()],
    });
  }

  const edits: EditPanel[] = [];
  const pushChartTypeEdit = (panelId: string, chartType: string) => {
    if (!isSupportedChartType(chartType)) {
      return;
    }
    edits.push({
      source: 'request',
      type: 'vis',
      panelId,
      chartType,
      query: chartTypeQuery(chartType),
    });
  };

  for (const finding of findings) {
    if (finding.rule === 'wrong_chart_type') {
      pushChartTypeEdit(finding.panel_id, finding.fix.chartType);
    }
  }
  for (const finding of findings) {
    if (finding.rule === 'one_category_chart') {
      pushChartTypeEdit(finding.panel_id, finding.fix.chartType);
    }
  }
  for (const finding of findings) {
    if (finding.rule === 'monotone_chart_types') {
      for (const change of finding.fix.changes) {
        pushChartTypeEdit(change.panel_id, change.chartType);
      }
    }
  }

  if (edits.length > 0) {
    operations.push({
      operation: 'edit_panels',
      panels: edits,
    });
  }

  const weakControls = findings.find((finding) => finding.rule === 'weak_controls');
  if (weakControls) {
    operations.push({
      operation: 'add_controls',
      controls: weakControls.fix.add,
    });
  }

  return operations;
};
