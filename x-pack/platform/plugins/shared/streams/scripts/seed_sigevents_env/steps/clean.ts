/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import { cleanTasks } from './seed_tasks';

async function deleteByMatchAll(esClient: Client, index: string, log: ToolingLog): Promise<void> {
  try {
    await esClient.deleteByQuery({ index, conflicts: 'proceed', query: { match_all: {} } });
    log.info(`clean: wiped ${index}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('index_not_found_exception')) throw err;
    log.info(`clean: ${index} not found, skipping`);
  }
}

export async function cleanSeedData(
  ctx: SeedContext,
  esClient: Client,
  config: ConnectionConfig,
  log: ToolingLog,
  cleanLogs: boolean
): Promise<void> {
  await deleteByMatchAll(esClient, '.kibana_streams_features-*', log);
  await deleteByMatchAll(esClient, '.alerts-streams.alerts-default', log);

  // Queries are Kibana alerting rules — must be deleted via the API to tear down rule state.
  // List all on the stream so we catch leftovers from previous scenario runs.
  const listPath = `/api/streams/${encodeURIComponent(ctx.streamName)}/queries`;
  const listRes = await kibanaRequest(config, 'GET', listPath);
  if (listRes.status >= 300) {
    throw new Error(`clean: failed to list queries (HTTP ${listRes.status})`);
  }
  const allQueries: Array<Record<string, unknown>> =
    listRes.data &&
    typeof listRes.data === 'object' &&
    Array.isArray((listRes.data as { queries?: unknown }).queries)
      ? ((listRes.data as { queries: unknown[] }).queries.filter(
          (q): q is Record<string, unknown> => q !== null && typeof q === 'object'
        ) as Array<Record<string, unknown>>)
      : [];

  for (const query of allQueries) {
    const queryId = query.id;
    if (typeof queryId !== 'string' || queryId.length === 0) continue;
    const path = `/api/streams/${encodeURIComponent(ctx.streamName)}/queries/${encodeURIComponent(
      queryId
    )}`;
    const delRes = await kibanaRequest(config, 'DELETE', path);
    if (delRes.status >= 300 && delRes.status !== 404) {
      log.warning(
        `clean: DELETE query "${queryId}" → HTTP ${delRes.status} ${JSON.stringify(delRes.data)}`
      );
    }
  }
  if (allQueries.length > 0) {
    log.info(`clean: deleted ${allQueries.length} query/queries from stream "${ctx.streamName}"`);
  }

  // Insights — list all then bulk-delete via the Kibana API.
  const insightsRes = await kibanaRequest(config, 'GET', '/internal/streams/_insights');
  const allInsights: Array<{ id: string }> =
    insightsRes.status < 300 &&
    insightsRes.data &&
    typeof insightsRes.data === 'object' &&
    Array.isArray((insightsRes.data as { insights?: unknown }).insights)
      ? ((insightsRes.data as { insights: unknown[] }).insights.filter(
          (i): i is { id: string } =>
            i !== null && typeof i === 'object' && typeof (i as { id?: unknown }).id === 'string'
        ) as Array<{ id: string }>)
      : [];

  if (allInsights.length > 0) {
    const bulkRes = await kibanaRequest(config, 'POST', '/internal/streams/_insights/_bulk', {
      operations: allInsights.map((i) => ({ delete: { id: i.id } })),
    });
    if (bulkRes.status >= 300) {
      log.warning(
        `clean: insights bulk delete → HTTP ${bulkRes.status} ${JSON.stringify(bulkRes.data)}`
      );
    } else {
      log.info(`clean: deleted ${allInsights.length} insight(s)`);
    }
  }

  log.info('clean: deleting seeded task docs');
  await cleanTasks(ctx, esClient, log);

  if (cleanLogs) {
    log.info(`clean: deleting data stream "${ctx.streamName}"`);
    await esClient.indices.deleteDataStream({ name: ctx.streamName });
  }

  log.info('clean: finished');
}
