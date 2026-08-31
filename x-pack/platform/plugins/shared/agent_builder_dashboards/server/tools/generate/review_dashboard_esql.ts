/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import {
  ESQL_REVIEW_TOPIC,
  extractEsqlFromSpec,
  getEsqlDataSourceCarriers,
  lintVisualizationEsql,
  type VisualizationEsqlLintProblem,
} from '@kbn/agent-builder-visualizations-server';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

export type DashboardEsqlReviewProblem = {
  topic: typeof ESQL_REVIEW_TOPIC;
  severity: VisualizationEsqlLintProblem['severity'];
  detail: string;
  panel_id: string;
};

const queriesFromPanelConfig = (type: string, config: unknown): string[] => {
  if (type === VEGA_VIS_TYPE) {
    const spec = (config as { spec?: unknown } | null)?.spec;
    const query = extractEsqlFromSpec(
      typeof spec === 'string' || (spec && typeof spec === 'object') ? spec : undefined
    );
    return query ? [query] : [];
  }

  const queries: string[] = [];
  for (const { data_source: dataSource } of getEsqlDataSourceCarriers(config)) {
    if (dataSource?.type === 'esql' && dataSource.query) {
      queries.push(dataSource.query);
    }
  }
  return queries;
};

/**
 * Deterministic visualization ES|QL misses for every Lens/Vega panel, including
 * panels inside sections. Does not call a model and does not inspect mappings.
 */
export const lintDashboardVisualizationEsql = (
  dashboard: DashboardAttachmentData
): DashboardEsqlReviewProblem[] => {
  const problems: DashboardEsqlReviewProblem[] = [];

  const lintPanel = (panel: { id: string; type: string; config: unknown }) => {
    for (const query of queriesFromPanelConfig(panel.type, panel.config)) {
      for (const lint of lintVisualizationEsql(query)) {
        problems.push({
          topic: ESQL_REVIEW_TOPIC,
          severity: lint.severity,
          detail: lint.detail,
          panel_id: panel.id,
        });
      }
    }
  };

  walkVisualizationPanels(dashboard, lintPanel);

  return problems;
};

const walkVisualizationPanels = (
  dashboard: DashboardAttachmentData,
  visit: (panel: { id: string; type: string; config: unknown }) => void
): void => {
  for (const widget of dashboard.panels) {
    if (isSection(widget)) {
      for (const panel of widget.panels) {
        visit(panel);
      }
    } else {
      visit(widget);
    }
  }
};
