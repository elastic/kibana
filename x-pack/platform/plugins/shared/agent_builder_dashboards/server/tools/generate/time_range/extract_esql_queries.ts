/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getEsqlDataSourceCarriers } from '@kbn/agent-builder-visualizations-server';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

/**
 * Extract ES|QL queries from every `data_source` carrier in a Lens config.
 *
 * Some Lens configs store the query on the root config, while layered charts
 * store one query per layer.
 */
const getEsqlQueriesFromConfig = (config: unknown): string[] => {
  const queries: string[] = [];
  for (const { data_source: dataSource } of getEsqlDataSourceCarriers(config)) {
    if (dataSource?.type === 'esql' && dataSource.query) {
      queries.push(dataSource.query);
    }
  }
  return queries;
};

/**
 * Distinct ES|QL queries backing the dashboard's Lens panels, including panels
 * nested inside sections. Markdown and any non-ES|QL Lens panels carry no query
 * and are ignored.
 */
export const extractEsqlQueries = (panels: DashboardAttachmentData['panels']): string[] => {
  const queries = new Set<string>();
  const collect = (config: unknown) => {
    for (const query of getEsqlQueriesFromConfig(config)) {
      queries.add(query);
    }
  };

  for (const widget of panels) {
    if (isSection(widget)) {
      for (const panel of widget.panels) {
        if (panel.type === LENS_EMBEDDABLE_TYPE) {
          collect(panel.config);
        }
      }
    } else if (widget.type === LENS_EMBEDDABLE_TYPE) {
      collect(widget.config);
    }
  }

  return [...queries];
};
