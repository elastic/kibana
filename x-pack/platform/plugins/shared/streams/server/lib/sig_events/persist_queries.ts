/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { HIGH_SEVERITY_THRESHOLD, normalizeEsqlSafe, QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../streams/ki';
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
    kiClient: KnowledgeIndicatorClient;
    streamsClient: StreamsClient;
  }
): Promise<PersistQueriesResult> {
  const { kiClient, streamsClient } = deps;

  if (queries.length === 0) {
    return { persistedQueries: [], skippedQueries: [] };
  }

  const definition = await streamsClient.getStream(streamName);

  const { [streamName]: existingLinks } = await kiClient.getStreamToQueryLinksMap([streamName]);
  const existingById = new Map(existingLinks.map((link) => [link.query.id, link.query]));
  const existingEsqls = new Set(
    existingLinks.map((link) => normalizeEsqlSafe(link.query.esql.query))
  );
  const ruleBackedIds = new Set(
    existingLinks.filter((link) => link.rule_backed).map((link) => link.query.id)
  );

  const standardOps: KIBulkOperation[] = [];
  const ruleEligibleQueries: Array<{ id: string } & GeneratedSignificantEventQuery> = [];
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
      const queryId = replaces;
      if (ruleBackedIds.has(queryId)) {
        ruleEligibleQueries.push({ id: queryId, ...query });
      } else {
        standardOps.push({ index: { query: { id: queryId, ...indexFields, rule_backed: false } } });
      }
      persistedQueries.push({ ...query, id: queryId });
    } else {
      const id = v4();
      if (isRuleEligible(query)) {
        ruleEligibleQueries.push({ id, ...query });
      } else {
        standardOps.push({ index: { query: { id, ...indexFields, rule_backed: false } } });
      }
      persistedQueries.push({ ...query, id });
    }
  }

  if (standardOps.length > 0) {
    await kiClient.bulk(streamName, standardOps);
  }

  if (ruleEligibleQueries.length > 0) {
    const { [streamName]: currentLinks } = await kiClient.getStreamToQueryLinksMap([streamName]);
    await kiClient.syncQueries(
      definition,
      ruleEligibleQueries.map(({ replaces: _replaces, ...q }) => q),
      { currentLinks }
    );
  }

  return { persistedQueries, skippedQueries };
}
