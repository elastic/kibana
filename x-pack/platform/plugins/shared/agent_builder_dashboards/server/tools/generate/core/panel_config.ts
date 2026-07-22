/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlDataSourceCarriers } from '@kbn/agent-builder-visualizations-server';

export interface PanelConfigSummary {
  title?: string;
  type?: string;
  data_source?: {
    type: 'esql';
    query: string;
  };
}

export const getEsqlQueries = (config: unknown): string[] => {
  const queries = new Set<string>();

  for (const { data_source: dataSource } of getEsqlDataSourceCarriers(config)) {
    if (dataSource?.type === 'esql' && dataSource.query) {
      queries.add(dataSource.query);
    }
  }

  return [...queries];
};

export const summarizePanelConfig = (config: Record<string, unknown>): PanelConfigSummary => {
  const summary: PanelConfigSummary = {};
  const { title, type } = config;

  if (typeof title === 'string') {
    summary.title = title;
  }
  if (typeof type === 'string') {
    summary.type = type;
  }

  const [query] = getEsqlQueries(config);
  if (query) {
    summary.data_source = { type: 'esql', query };
  }

  return summary;
};
