/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { HIGH_SEVERITY_THRESHOLD, normalizeEsqlSafe, QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import type {
  QueryClient,
  QueryClientBulkIndexOperation,
} from '../streams/assets/query/query_client';
import type { StreamsClient } from '../streams/client';

export interface PersistQueriesResult {
  persistedQueries: Array<GeneratedSignificantEventQuery & { id: string }>;
  skippedQueries: GeneratedSignificantEventQuery[];
}

function isRuleEligible(query: GeneratedSignificantEventQuery): boolean {
  return query.type !== QUERY_TYPE_STATS && query.severity_score >= HIGH_SEVERITY_THRESHOLD;
}

export async function persistQueries(
  streamName: string,
  queries: GeneratedSignificantEventQuery[],
  deps: {
    queryClient: QueryClient;
    streamsClient: StreamsClient;
  }
): Promise<PersistQueriesResult> {
  const { queryClient, streamsClient } = deps;

  if (queries.length === 0) {
    return { persistedQueries: [], skippedQueries: [] };
  }

  const definition = await streamsClient.getStream(streamName);

  const { [streamName]: existingLinks } = await queryClient.getStreamToQueryLinksMap([streamName]);
  const existingById = new Map(existingLinks.map((link) => [link.query.id, link.query]));
  const existingEsqls = new Set(
    existingLinks.map((link) => normalizeEsqlSafe(link.query.esql.query))
  );
  const ruleBackedIds = new Set(
    existingLinks.filter((link) => link.rule_backed).map((link) => link.query.id)
  );

  const standardOps: QueryClientBulkIndexOperation[] = [];
  const ruleOps: QueryClientBulkIndexOperation[] = [];
  const persistedQueries: Array<GeneratedSignificantEventQuery & { id: string }> = [];
  const skippedQueries: GeneratedSignificantEventQuery[] = [];

  for (const query of queries) {
    const { replaces, ...indexFields } = query;

    const normalizedEsql = normalizeEsqlSafe(query.esql.query);

    if (existingEsqls.has(normalizedEsql)) {
      skippedQueries.push(query);
      continue;
    }

    existingEsqls.add(normalizedEsql);

    if (replaces && existingById.has(replaces)) {
      const op = { index: { id: replaces, ...indexFields } };
      if (ruleBackedIds.has(replaces)) {
        ruleOps.push(op);
      } else {
        standardOps.push(op);
      }
      persistedQueries.push({ ...query, id: replaces });
    } else {
      const id = v4();
      const op = { index: { id, ...indexFields } };
      if (isRuleEligible(query)) {
        ruleOps.push(op);
      } else {
        standardOps.push(op);
      }
      persistedQueries.push({ ...query, id });
    }
  }

  if (standardOps.length > 0) {
    await queryClient.bulk(definition, standardOps, { createRules: false });
  }

  // Rule-backed replacements and new high-severity non-STATS queries go
  // through the default path (syncQueries) so that backing Kibana rules
  // are created, updated, or properly uninstalled.
  if (ruleOps.length > 0) {
    await queryClient.bulk(definition, ruleOps);
  }

  return { persistedQueries, skippedQueries };
}
