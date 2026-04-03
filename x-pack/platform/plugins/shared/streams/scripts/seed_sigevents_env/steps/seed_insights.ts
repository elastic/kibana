/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { getImpactLevel } from '@kbn/streams-schema';
import type { SeedContext, SeedScenario, SeededQuery } from '../types';
import { deterministicId } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';

/**
 * Builds the insight payload objects shared by seedInsights (Kibana API) and
 * buildTaskDocs in seed_tasks.ts (.kibana_streams_tasks). Both callers read
 * generatedAt from ctx so the two storage paths always stay in sync.
 */
export function buildInsightPayloads(
  ctx: SeedContext,
  scenario: SeedScenario,
  seededQueries: SeededQuery[]
): Array<Record<string, unknown>> {
  const evidence = seededQueries.map((q) => ({
    stream_name: ctx.streamName,
    query_title: q.title,
    // event_count is intentionally 0 for seeded insights — actual match counts are not
    // available at seed time without re-running the ESQL queries here.
    event_count: 0,
  }));

  return scenario.insights.map((insight) => ({
    id: deterministicId(ctx.scenarioName, 'insight', insight.title),
    title: insight.title,
    description: insight.description,
    impact: insight.impact,
    impact_level: getImpactLevel(insight.impact),
    evidence,
    recommendations: insight.recommendations,
    generated_at: ctx.generatedAt,
  }));
}

export async function seedInsights(
  ctx: SeedContext,
  scenario: SeedScenario,
  seededQueries: SeededQuery[],
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const payloads = buildInsightPayloads(ctx, scenario, seededQueries);
  const operations = payloads.map((insight) => ({ index: insight }));

  const res = await kibanaRequest(config, 'POST', '/internal/streams/_insights/_bulk', {
    operations,
  });

  if (res.status >= 300) {
    log.error(`Insights bulk failed: ${res.status} ${JSON.stringify(res.data)}`);
    throw new Error(`Failed to bulk-index insights (HTTP ${res.status})`);
  }

  log.info(`Posted ${operations.length} insight operation(s).`);
}
