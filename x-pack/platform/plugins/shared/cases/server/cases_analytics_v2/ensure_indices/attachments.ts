/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ATTACHMENTS_INDEX_NAME } from '../constants';
import { ATTACHMENTS_INDEX_MAPPING } from '../mappings/attachments';

/**
 * Idempotently creates `.cases-attachments` if it doesn't already
 * exist. Safe to call from multiple Kibana nodes concurrently — the
 * second caller hits an `already_exists` exception and short-circuits.
 * Mirrors `ensureCaseIndex` and `ensureActivityIndex`.
 *
 * Settings (mirrors `ensureActivityIndex` — both are non-lookup fact
 * tables joined to `.cases`):
 *   - `index.hidden: true` — not surfaced by default in `_cat/indices`
 *     and excluded from queries that don't opt in.
 *   - `auto_expand_replicas: '0-1'` — 0 replicas on single-node clusters
 *     (dev/CI), 1 replica on multi-node clusters. Without this, ES
 *     defaults to `number_of_replicas: 1`, so the index costs 2 shards
 *     even on a single-node cluster; dev/CI environments already near the
 *     default `cluster.max_shards_per_node` limit (1000) then fail
 *     creation with `validation_exception` before the feature can start.
 *
 * No `index.mode: lookup`: `.cases-attachments` is a fact table joined
 * to `.cases` via ES|QL `LOOKUP JOIN cases ON cases.id`; the
 * lookup-mode index is on the `.cases` side.
 *
 * Failure policy: throws on unexpected errors so callers can decide how
 * to handle them (matches `ensureCaseIndex` / `ensureActivityIndex`).
 * Plugin start wraps in `Promise.allSettled` and leaves this surface's
 * writer a no-op on failure — so a swallowed error can no longer flip
 * the writer to "real" against an index that was never created; the
 * `/reset` route surfaces a 500. `resource_already_exists_exception` is
 * swallowed (concurrent bootstrap race is a success).
 */
export async function ensureAttachmentsIndex({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: ATTACHMENTS_INDEX_NAME });
    if (exists) {
      logger.debug(`${ATTACHMENTS_INDEX_NAME} already exists; skipping bootstrap`);
      return;
    }

    await esClient.indices.create({
      index: ATTACHMENTS_INDEX_NAME,
      settings: {
        'index.hidden': true,
        'index.auto_expand_replicas': '0-1',
      },
      mappings: ATTACHMENTS_INDEX_MAPPING,
    });

    logger.info(`bootstrapped ${ATTACHMENTS_INDEX_NAME}`);
  } catch (err) {
    // Two Kibana nodes starting in parallel can both pass the `exists`
    // check and race on `create`. The loser gets
    // `resource_already_exists_exception` — the index exists, which is
    // exactly what was needed, so swallow and return.
    const errType = err?.body?.error?.type ?? err?.meta?.body?.error?.type;
    if (errType === 'resource_already_exists_exception') {
      logger.debug(`${ATTACHMENTS_INDEX_NAME} already exists (concurrent bootstrap)`);
      return;
    }

    // Surface shard-limit failures with an actionable message. See
    // `ensureCaseIndex` for the full explanation — the same fix applies:
    //
    //   PUT _cluster/settings
    //   { "persistent": { "cluster.max_shards_per_node": 1500 } }
    if (errType === 'validation_exception') {
      const reason: string =
        err?.body?.error?.reason ?? err?.meta?.body?.error?.reason ?? err?.message ?? '';
      if (reason.includes('shards')) {
        throw new Error(
          `Bootstrap of ${ATTACHMENTS_INDEX_NAME} failed: cluster may be at the shard limit. ` +
            `Increase cluster.max_shards_per_node. ` +
            `Original error: ${reason}`
        );
      }
    }

    // Rethrow so the caller decides how to handle it (plugin start logs
    // and keeps the writer a no-op; `/reset` returns 500).
    throw err;
  }
}
