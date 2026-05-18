/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ACTIVITY_INDEX_NAME } from '../constants';
import { ACTIVITY_INDEX_MAPPING } from '../mappings/activity';

/**
 * Idempotently creates `.cases-activity` if it doesn't already exist.
 * Safe to call from multiple Kibana nodes concurrently — the second
 * caller hits an `already_exists` exception and short-circuits. Mirrors
 * `ensureCaseIndex` for the `.cases` surface.
 *
 * Settings:
 *   - `index.hidden: true` — not surfaced by default in `_cat/indices`
 *     and excluded from queries that don't opt in.
 *
 * No `index.mode: lookup`: `.cases-activity` is the fact table in the
 * analytics model. ES|QL queries
 * `FROM .cases-activity | LOOKUP JOIN .cases ON cases.id`; the
 * lookup-mode index is on the `.cases` side.
 *
 * Failure policy: log, don't throw. Bootstrap failure must not block
 * plugin start; administrators see ERROR logs and can re-trigger via
 * `/reset`.
 */
export async function ensureActivityIndex({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: ACTIVITY_INDEX_NAME });
    if (exists) {
      logger.debug(`${ACTIVITY_INDEX_NAME} already exists; skipping bootstrap`);
      return;
    }

    await esClient.indices.create({
      index: ACTIVITY_INDEX_NAME,
      settings: {
        'index.hidden': true,
      },
      mappings: ACTIVITY_INDEX_MAPPING,
    });

    logger.info(`bootstrapped ${ACTIVITY_INDEX_NAME}`);
  } catch (err) {
    // Two Kibana nodes starting in parallel can both pass the `exists`
    // check and race on `create`. The loser gets
    // `resource_already_exists_exception`, which is a no-op here — the
    // index exists, that's all that was needed.
    const errType = err?.body?.error?.type ?? err?.meta?.body?.error?.type;
    if (errType === 'resource_already_exists_exception') {
      logger.debug(`${ACTIVITY_INDEX_NAME} already exists (concurrent bootstrap)`);
      return;
    }

    // Anything else: log and continue. Bootstrap can be re-attempted via
    // the administrator `/reset` endpoint; the plugin must still start.
    logger.error(`failed to bootstrap ${ACTIVITY_INDEX_NAME}: ${err.message}`, { error: err });
  }
}
