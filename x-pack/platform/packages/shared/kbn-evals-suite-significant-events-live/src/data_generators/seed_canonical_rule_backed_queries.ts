/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '@kbn/evals-suite-significant-events';
import type { CanonicalRuleQuery } from '../scenarios/types';

// Generous TTL so seeded queries are not filtered out by `expires_at >= NOW()` reader gates.
const TTL_MILLIS = 30 * 24 * 60 * 60 * 1000;

/**
 * Seed canonical queries as rule-backed knowledge-indicator revisions in the LIVE KI data
 * stream. `getRuleBackedQueryLinks` (the change-point scan's rule source) reads the latest
 * revision per query id where `query.rule_backed == true`, so these docs are all the detection
 * stage needs — no Alerting rule entity is installed; `.rule-events` signals referencing
 * `query.rule_id` are synthesized separately.
 *
 * Document shape mirrors the product's `toStoredQuery` serializer in
 * `x-pack/platform/plugins/shared/significant_events/server/lib/knowledge_indicators/knowledge_indicator_client/serializers.ts`
 * (dotted `stream.name` key, `query.*` payload; stored type in `../data_stream.ts`), minus
 * `search_embedding` — semantic text requires an inference endpoint the eval cluster may not
 * have, and the KI snapshot replay strips it for the same reason. This shape is duplicated
 * because the serializer lives in plugin server code that packages cannot import; if the scan
 * stops picking these queries up (`getRuleBackedQueryLinks`), check that file for drift first.
 */
export async function seedCanonicalRuleBackedQueries(
  esClient: Client,
  log: ToolingLog,
  {
    streamName,
    queries,
  }: {
    streamName: string;
    queries: CanonicalRuleQuery[];
  }
): Promise<void> {
  if (queries.length === 0) {
    return;
  }

  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const expiresAt = new Date(now + TTL_MILLIS).toISOString();

  const operations = queries.flatMap((query) => [
    { create: { _index: KNOWLEDGE_INDICATORS_DATA_STREAM } },
    {
      '@timestamp': timestamp,
      id: query.query_id,
      type: 'query',
      title: query.title,
      description: query.description,
      'stream.name': streamName,
      expires_at: expiresAt,
      query: {
        esql: query.esql,
        query_type: 'match',
        severity_score: query.severity_score,
        rule_backed: true,
        rule_id: query.rule_uuid,
      },
    },
  ]);

  const response = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) {
    const failures = response.items
      .filter((item) => item.create?.error)
      .slice(0, 5)
      .map((item) => JSON.stringify(item.create?.error));
    throw new Error(
      `Failed to seed canonical rule-backed queries into ${KNOWLEDGE_INDICATORS_DATA_STREAM}: ${failures.join(
        '; '
      )}`
    );
  }

  log.info(
    `Seeded ${queries.length} canonical rule-backed quer${
      queries.length === 1 ? 'y' : 'ies'
    } into ${KNOWLEDGE_INDICATORS_DATA_STREAM}`
  );
}
