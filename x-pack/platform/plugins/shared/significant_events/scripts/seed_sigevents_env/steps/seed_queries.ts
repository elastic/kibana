/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext, SeedScenario, SeededQuery, SeedQuery } from '../types';
import { deterministicId } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';

const ASSET_FETCH_SIZE = 1000;
const PROMOTE_POLL_INTERVAL_MS = 500;
const PROMOTE_TIMEOUT_MS = 15_000;

export async function seedQueries(
  ctx: SeedContext,
  scenario: SeedScenario,
  config: ConnectionConfig,
  esClient: Client,
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
    const res = await kibanaRequest(config, 'PUT', path, body);
    if (res.status >= 300) {
      log.error(`PUT query failed for "${q.title}": ${res.status} ${JSON.stringify(res.data)}`);
      throw new Error(`Failed to upsert query "${q.title}" (HTTP ${res.status})`);
    }
  }

  const promoteRes = await kibanaRequest(config, 'POST', '/internal/streams/queries/_promote');

  if (promoteRes.status >= 300) {
    throw new Error(`Query promotion failed (HTTP ${promoteRes.status})`);
  }

  const expectedQueryIds = new Set(prepared.map(({ queryId }) => queryId));
  const deadline = Date.now() + PROMOTE_TIMEOUT_MS;

  const ruleIdByAssetId = new Map<string, string>();

  const readAssets = async () => {
    const assetRes = await esClient.search({
      index: '.kibana_streams_assets',
      size: ASSET_FETCH_SIZE,
      query: { term: { 'stream.name': ctx.streamName } },
    });

    const totalHits =
      typeof assetRes.hits.total === 'number'
        ? assetRes.hits.total
        : assetRes.hits.total?.value ?? 0;
    if (totalHits > ASSET_FETCH_SIZE) {
      log.warning(
        `seedQueries: .kibana_streams_assets has ${totalHits} docs for "${ctx.streamName}" — only first ${ASSET_FETCH_SIZE} read; some rule_ids may be missing`
      );
    }

    ruleIdByAssetId.clear();
    for (const hit of assetRes.hits.hits) {
      const src = hit._source as Record<string, unknown> | undefined;
      if (!src) continue;
      const assetId = src['asset.id'];
      const ruleId = src.rule_id;
      if (typeof assetId === 'string' && typeof ruleId === 'string' && ruleId.length > 0) {
        ruleIdByAssetId.set(assetId, ruleId);
      }
    }
  };

  while (true) {
    try {
      await readAssets();
    } catch (err) {
      // Transient ES errors (network, 5xx) — log and retry rather than aborting the poll.
      log.debug(
        `seedQueries: readAssets error (retrying): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (
      ruleIdByAssetId.size >= expectedQueryIds.size &&
      [...expectedQueryIds].every((id) => ruleIdByAssetId.has(id))
    ) {
      break;
    }

    if (Date.now() >= deadline) {
      const missing = [];
      for (const id of expectedQueryIds) {
        if (!ruleIdByAssetId.has(id)) {
          missing.push(id);
        }
      }

      throw new Error(
        `seedQueries: timed out after ${PROMOTE_TIMEOUT_MS}ms waiting for rule_ids. ` +
          `Promotion may not have completed. Missing query IDs: ${missing.join(', ')}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, PROMOTE_POLL_INTERVAL_MS));
  }

  return prepared.map(({ q, queryId, esql }) => ({
    queryId,
    ruleId: ruleIdByAssetId.get(queryId) as string,
    title: q.title,
    esql,
    severityScore: q.severityScore,
    description: q.description,
  }));
}
