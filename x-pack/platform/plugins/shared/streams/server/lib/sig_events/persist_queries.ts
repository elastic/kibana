/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedSignificantEventQuery, StreamQuery } from '@kbn/streams-schema';
import {
  deriveQueryType,
  HIGH_SEVERITY_THRESHOLD,
  normalizeEsqlSafe,
  QUERY_TYPE_STATS,
} from '@kbn/streams-schema';
import { v4 } from 'uuid';
import type { KIBulkOperation, KnowledgeIndicatorClient } from '../streams/ki';
import type { StreamsClient } from '../streams/client';

export interface PersistQueriesResult {
  persistedQueries: Array<GeneratedSignificantEventQuery & { id: string }>;
  skippedQueries: GeneratedSignificantEventQuery[];
}

function isRuleEligible(query: GeneratedSignificantEventQuery): boolean {
  return (
    deriveQueryType(query.esql.query) !== QUERY_TYPE_STATS &&
    query.severity_score >= HIGH_SEVERITY_THRESHOLD
  );
}

/**
 * Promote a `GeneratedSignificantEventQuery` (the LLM output schema) to a
 * `StreamQuery` shape suitable for persistence. The server-side `deriveQueryType`
 * is the authoritative source of truth for `type`.
 */
function toStreamQuery(
  id: string,
  generated: Omit<GeneratedSignificantEventQuery, 'replaces'>
): StreamQuery {
  return {
    id,
    title: generated.title,
    description: generated.description,
    esql: generated.esql,
    type: deriveQueryType(generated.esql.query),
    severity_score: generated.severity_score,
    evidence: generated.evidence,
    features: generated.features,
  };
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

  // `standardOps` go through bulk (data-only); `ruleOps` go through syncQueries
  // (data + Kibana rule lifecycle). syncQueries is set-based, so we build the
  // full next state by merging existing queries with the rule-eligible ones.
  const standardOps: KIBulkOperation[] = [];
  const ruleQueries: StreamQuery[] = [];
  const replacedRuleQueryIds = new Set<string>();
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

    let id: string;
    let routeToRules: boolean;
    if (replaces && existingById.has(replaces)) {
      id = replaces;
      routeToRules = ruleBackedIds.has(replaces);
      if (routeToRules) {
        replacedRuleQueryIds.add(replaces);
      }
    } else {
      id = v4();
      routeToRules = isRuleEligible(query);
    }

    const streamQuery = toStreamQuery(id, indexFields);

    if (routeToRules) {
      ruleQueries.push(streamQuery);
    } else {
      standardOps.push({ index: { query: streamQuery } });
    }
    persistedQueries.push({ ...query, id });
  }

  // Rule-backed replacements and new high-severity non-STATS queries go
  // through syncQueries so that backing Kibana rules are created, updated, or
  // properly uninstalled. syncQueries is set-based: pass the merged "next"
  // state (existing rule-backed queries + new rule queries, with replaced ids
  // taking the new content).
  if (ruleQueries.length > 0) {
    const newById = new Map(ruleQueries.map((q) => [q.id, q]));
    const merged: StreamQuery[] = existingLinks.map((link) =>
      newById.has(link.query.id) ? newById.get(link.query.id)! : link.query
    );
    for (const q of ruleQueries) {
      if (!existingById.has(q.id)) {
        merged.push(q);
      }
    }
    await kiClient.syncQueries(definition, merged, { currentLinks: existingLinks });
  }

  if (standardOps.length > 0) {
    await kiClient.bulk(streamName, standardOps);
  }

  return { persistedQueries, skippedQueries };
}
