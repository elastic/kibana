/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { normalizeEsqlSafe } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import type {
  QueryClient,
  QueryClientBulkIndexOperation,
} from '../streams/assets/query/query_client';
import type { StreamsClient } from '../streams/client';

export interface PersistQueriesResult {
  persisted: number;
  skipped: number;
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
    return { persisted: 0, skipped: 0 };
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
  const ruleBackedReplaceOps: QueryClientBulkIndexOperation[] = [];
  let skipped = 0;

  for (const query of queries) {
    const fields = {
      type: query.type,
      esql: query.esql,
      title: query.title,
      description: query.description,
      severity_score: query.severity_score,
      evidence: query.evidence,
    };

    const normalizedEsql = normalizeEsqlSafe(query.esql.query);

    if (existingEsqls.has(normalizedEsql)) {
      skipped++;
      continue;
    }

    existingEsqls.add(normalizedEsql);

    if (query.replaces && existingById.has(query.replaces)) {
      const op = { index: { id: query.replaces, ...fields } };
      if (ruleBackedIds.has(query.replaces)) {
        ruleBackedReplaceOps.push(op);
      } else {
        standardOps.push(op);
      }
    } else {
      standardOps.push({ index: { id: v4(), ...fields } });
    }
  }

  const persisted = standardOps.length + ruleBackedReplaceOps.length;

  if (persisted === 0) {
    return { persisted: 0, skipped };
  }

  if (standardOps.length > 0) {
    await queryClient.bulk(definition, standardOps, { createRules: false });
  }

  // Rule-backed replacements go through the default path (syncQueries) so
  // that backing Kibana rules are updated/recreated when the ES|QL changes,
  // or properly uninstalled when the replacement is STATS-shaped.
  if (ruleBackedReplaceOps.length > 0) {
    await queryClient.bulk(definition, ruleBackedReplaceOps);
  }

  return { persisted, skipped };
}
