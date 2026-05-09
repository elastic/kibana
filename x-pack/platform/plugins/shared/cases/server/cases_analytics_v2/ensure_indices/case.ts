/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CASE_INDEX_NAME } from '../constants';
import { CASE_INDEX_MAPPING } from '../mappings/case';

/**
 * Idempotently creates `.cases` if it doesn't already exist. Safe to call from
 * multiple Kibana nodes concurrently — the second caller hits an
 * `already_exists` exception and short-circuits.
 *
 * Settings:
 *   - `index.hidden: true`  → not surfaced by default in `_cat/indices` and
 *                             excluded from queries that don't explicitly opt
 *                             in. Out-of-the-box visibility is restricted to
 *                             operators querying directly via Console.
 *   - `index.mode: lookup`  → required for `LOOKUP JOIN` from ES|QL queries on
 *                             the activity / attachments surfaces. Single
 *                             primary shard; cases data fits comfortably (a
 *                             tenant with millions of cases at ~2KB/doc is a
 *                             few GB, well under shard limits).
 *
 * **Failure policy: log, don't throw.** A bootstrap failure must not block
 * plugin start — cases-analytics is a downstream feature, and its absence
 * shouldn't take down the cases plugin. Operators see ERROR-level logs and
 * can re-trigger via the future reset endpoint.
 */
export async function ensureCaseIndex({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: CASE_INDEX_NAME });
    if (exists) {
      logger.debug(`${CASE_INDEX_NAME} already exists; skipping bootstrap`);
      return;
    }

    await esClient.indices.create({
      index: CASE_INDEX_NAME,
      settings: {
        'index.hidden': true,
        'index.mode': 'lookup',
      },
      mappings: CASE_INDEX_MAPPING,
    });

    logger.info(`bootstrapped ${CASE_INDEX_NAME}`);
  } catch (err) {
    // Two Kibana nodes starting in parallel can both pass the `exists` check
    // and race on `create`. The loser sees `resource_already_exists_exception`,
    // which is a no-op for us — the index is there, that's all we needed.
    const errType = err?.body?.error?.type ?? err?.meta?.body?.error?.type;
    if (errType === 'resource_already_exists_exception') {
      logger.debug(`${CASE_INDEX_NAME} already exists (concurrent bootstrap)`);
      return;
    }

    // Anything else: log and continue. Bootstrap can be re-attempted via the
    // operator reset endpoint. The plugin must keep starting regardless.
    logger.error(`failed to bootstrap ${CASE_INDEX_NAME}: ${err.message}`, { error: err });
  }
}
