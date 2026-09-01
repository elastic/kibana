/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext, SeedScenario, SeededQuery, SeedQuery } from '../types';
import { deterministicId } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import { computeRuleId } from '../../../server/lib/knowledge_indicators/helpers/compute_rule_id';

interface PromoteResponse {
  promoted: number;
  skipped_stats: number;
  skipped_ineligible: number;
}

export async function seedQueries(
  ctx: SeedContext,
  scenario: SeedScenario,
  config: ConnectionConfig,
  log: ToolingLog
): Promise<SeededQuery[]> {
  const prepared = scenario.queries.map((q: SeedQuery) => ({
    q,
    queryId: deterministicId(ctx.scenarioName, q.title, 'query'),
    esql: q.esql(ctx.streamName),
  }));

  for (const { q, queryId, esql } of prepared) {
    const path = `/api/streams/${encodeURIComponent(ctx.streamName)}/queries/${encodeURIComponent(
      queryId
    )}`;
    const body = {
      title: q.title,
      esql: { query: esql },
      ...(q.severityScore !== undefined ? { severity_score: q.severityScore } : {}),
      description: q.description ?? '',
    };
    const res = await kibanaRequest(config, 'PUT', path, body, ctx.space);
    if (res.status >= 300) {
      log.error(`PUT query failed for "${q.title}": ${res.status} ${JSON.stringify(res.data)}`);
      throw new Error(`Failed to upsert query "${q.title}" (HTTP ${res.status})`);
    }
  }

  const promoteRes = await kibanaRequest(
    config,
    'POST',
    '/internal/streams/queries/_promote',
    { queryIds: prepared.map(({ queryId }) => queryId) },
    ctx.space
  );

  if (promoteRes.status >= 300) {
    throw new Error(`Query promotion failed (HTTP ${promoteRes.status})`);
  }

  const promotion = promoteRes.data as PromoteResponse;
  if (promotion.skipped_stats > 0 || promotion.skipped_ineligible > 0) {
    throw new Error(
      `Query promotion skipped ${promotion.skipped_stats} STATS and ${promotion.skipped_ineligible} ineligible queries`
    );
  }

  return prepared.map(({ q, queryId, esql }) => ({
    queryId,
    ruleId: computeRuleId(ctx.streamName, queryId, esql),
    title: q.title,
    esql,
    severityScore: q.severityScore,
    description: q.description,
  }));
}
