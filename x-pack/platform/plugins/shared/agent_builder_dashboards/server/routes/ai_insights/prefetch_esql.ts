/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AI_INSIGHTS_MAX_ESQL_QUERIES,
  AI_INSIGHTS_MAX_ESQL_ROWS,
} from '../../../common/ai_insights/constants';
import type { AiInsightsPanelSummary } from '../../../common/ai_insights/types';

export interface PrefetchedEsqlResult {
  panel_id: string;
  panel_title: string;
  esql: string;
  values?: unknown[][];
  columns?: Array<{ name: string; type?: string }>;
  error?: string;
}

function withRowLimit(esql: string): string {
  if (/\blimit\b/i.test(esql)) {
    return esql;
  }
  return `${esql.trim()}\n| LIMIT ${AI_INSIGHTS_MAX_ESQL_ROWS}`;
}

export async function prefetchEsqlForPanels({
  esClient,
  panels,
  logger,
}: {
  esClient: ElasticsearchClient;
  panels: AiInsightsPanelSummary[];
  logger: Logger;
}): Promise<PrefetchedEsqlResult[]> {
  const candidates = panels
    .filter((panel) => typeof panel.esql === 'string' && panel.esql.trim().length > 0)
    .slice(0, AI_INSIGHTS_MAX_ESQL_QUERIES);

  const results: PrefetchedEsqlResult[] = [];

  for (const panel of candidates) {
    const esql = withRowLimit(panel.esql!);
    try {
      const response = await esClient.esql.query({
        query: esql,
        format: 'json',
      });

      const columns = (response.columns ?? []).map((column) => ({
        name: column.name,
        type: column.type,
      }));
      const values = (response.values ?? []).slice(0, AI_INSIGHTS_MAX_ESQL_ROWS);

      results.push({
        panel_id: panel.id,
        panel_title: panel.title,
        esql,
        columns,
        values,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`AI insights ES|QL prefetch failed for panel ${panel.id}: ${message}`);
      results.push({
        panel_id: panel.id,
        panel_title: panel.title,
        esql,
        error: message,
      });
    }
  }

  return results;
}
