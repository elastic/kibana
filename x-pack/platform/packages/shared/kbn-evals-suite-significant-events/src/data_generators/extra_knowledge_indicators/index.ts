/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../snapshot_indices';
import cartRedisCutoffExtraKisJson from './cart_redis_cutoff_extra_kis.json';

// Match replay_knowledge_indicators_snapshot.ts: generous TTL so injected KIs are not
// filtered by the reader's `expires_at >= NOW()` gate during the run.
const TTL_MILLIS = 30 * 24 * 60 * 60 * 1000;

export interface ExtraKnowledgeIndicator {
  id: string;
  type: 'feature' | 'query';
  title: string;
  description: string;
  tags?: string[];
  evidence?: string[];
  stream: { name: string };
  feature?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export const cartRedisCutoffExtraKis = cartRedisCutoffExtraKisJson as ExtraKnowledgeIndicator[];

/**
 * Bulk-index extra KIs into the canonical KI data stream. Stamps a fresh `@timestamp`
 * and future `expires_at` (mirrors the snapshot-replay stamping). No `search_embedding`:
 * the discovery agent lists KIs by `kind` + `stream_names`, so semantic ranking is unused.
 */
export const indexExtraKnowledgeIndicators = async (
  esClient: Client,
  log: ToolingLog,
  kis: ExtraKnowledgeIndicator[]
): Promise<{ indexed: number }> => {
  if (kis.length === 0) return { indexed: 0 };

  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const expiresAt = new Date(now + TTL_MILLIS).toISOString();

  const operations = kis.flatMap((ki) => [
    { create: {} },
    { ...ki, '@timestamp': timestamp, expires_at: expiresAt, deleted: false, excluded: false },
  ]);

  const resp = await esClient.bulk({ index: KNOWLEDGE_INDICATORS_DATA_STREAM, operations, refresh: true });

  if (resp.errors) {
    const firstError = resp.items.find((i) => i.create?.error)?.create?.error;
    throw new Error(`Failed to index extra KIs: ${JSON.stringify(firstError)}`);
  }

  log.info(`Indexed ${kis.length} extra knowledge indicators into ${KNOWLEDGE_INDICATORS_DATA_STREAM}`);
  return { indexed: kis.length };
};
