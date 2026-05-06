/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectsRepository,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CASES_ANALYTICS_STATE_SO_ID,
  CASES_ANALYTICS_STATE_SO_TYPE,
} from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import type { CasesAnalyticsWriterContract } from '../writer';
import type { CasesAnalyticsStateAttributes } from './state_so';

interface RunnerDeps {
  logger: Logger;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsWriterContract;
}

const PAGE_SIZE = 100;

/**
 * Reconciliation runner — the durability backstop for the synchronous writer.
 *
 * On each task tick:
 * 1. Read the last successful run timestamp from the state SO.
 * 2. Walk every case SO updated since that timestamp (across all spaces). For each,
 *    re-emit the `case` doc and recompute the `case_lifecycle` doc.
 * 3. Walk every user-action SO created since that timestamp. For each, re-emit the
 *    `case_activity` doc.
 * 4. Persist a new watermark.
 *
 * Idempotent. Worst case is overwriting an analytics doc with the same content.
 *
 * POC scope: walks all cases periodically. A future iteration can switch to
 * `_seq_no` watermarks for tighter coupling, but the timestamp-based approach is
 * sufficient for the demo.
 */
export const runReconciliation = async ({
  logger,
  internalSavedObjectsRepository,
  unsecuredSavedObjectsClient,
  writer,
}: RunnerDeps): Promise<void> => {
  const log = logger.get('cases.analytics.reconciliation');
  const startedAt = Date.now();
  log.debug('reconciliation tick starting');

  const previousState = await readState(internalSavedObjectsRepository, log);
  const since = previousState?.last_run_at ?? null;

  let casesIndexed = 0;
  let activityIndexed = 0;
  let lifecycleIndexed = 0;

  try {
    casesIndexed = await reconcileCases({
      log,
      unsecuredSavedObjectsClient,
      writer,
      since,
    });

    activityIndexed = await reconcileActivity({
      log,
      unsecuredSavedObjectsClient,
      writer,
      since,
    });

    lifecycleIndexed = await reconcileLifecycle({
      log,
      unsecuredSavedObjectsClient,
      writer,
      since,
    });

    await writeState(internalSavedObjectsRepository, log, {
      last_run_at: new Date(startedAt).toISOString(),
      last_run_stats: {
        cases_indexed: casesIndexed,
        activity_indexed: activityIndexed,
        lifecycle_indexed: lifecycleIndexed,
        duration_ms: Date.now() - startedAt,
      },
    });

    log.info(
      `reconciliation tick complete: cases=${casesIndexed} activity=${activityIndexed} lifecycle=${lifecycleIndexed} duration_ms=${
        Date.now() - startedAt
      }`
    );
  } catch (err) {
    log.error(`reconciliation tick failed: ${err.message}`);
    // Do NOT advance the watermark on failure — the next run picks up where we left off.
  }
};

const readState = async (
  repo: ISavedObjectsRepository,
  log: Logger
): Promise<CasesAnalyticsStateAttributes | null> => {
  try {
    const doc = await repo.get<CasesAnalyticsStateAttributes>(
      CASES_ANALYTICS_STATE_SO_TYPE,
      CASES_ANALYTICS_STATE_SO_ID
    );
    return doc.attributes;
  } catch (err) {
    if (err?.output?.statusCode === 404) {
      log.debug('no prior state — first reconciliation run');
      return null;
    }
    throw err;
  }
};

const writeState = async (
  repo: ISavedObjectsRepository,
  log: Logger,
  attributes: CasesAnalyticsStateAttributes
): Promise<void> => {
  try {
    await repo.create(CASES_ANALYTICS_STATE_SO_TYPE, attributes, {
      id: CASES_ANALYTICS_STATE_SO_ID,
      overwrite: true,
    });
  } catch (err) {
    log.warn(`failed to persist reconciliation state: ${err.message}`);
  }
};

const reconcileCases = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<number> => {
  const filter = since ? `${CASE_SAVED_OBJECT}.attributes.updated_at >= "${since}"` : undefined;

  let count = 0;
  for await (const batch of pagedFind<CasePersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_SAVED_OBJECT,
    filter,
  })) {
    for (const so of batch) {
      writer.upsertCase(so);
      count += 1;
    }
  }
  log.debug(`reconciled ${count} cases`);
  return count;
};

const reconcileLifecycle = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<number> => {
  const filter = since
    ? `${CASE_SAVED_OBJECT}.attributes.updated_at >= "${since}" or ${CASE_SAVED_OBJECT}.attributes.closed_at >= "${since}"`
    : undefined;

  let count = 0;
  for await (const batch of pagedFind<CasePersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_SAVED_OBJECT,
    filter,
  })) {
    for (const so of batch) {
      writer.recomputeLifecycle(so.id);
      count += 1;
    }
  }
  log.debug(`reconciled ${count} lifecycle docs`);
  return count;
};

const reconcileActivity = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<number> => {
  const filter = since
    ? `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.created_at >= "${since}"`
    : undefined;

  let count = 0;
  for await (const batch of pagedFind<UserActionPersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    filter,
  })) {
    for (const so of batch) {
      writer.appendActivity(so);
      count += 1;
    }
  }
  log.debug(`reconciled ${count} activity rows`);
  return count;
};

async function* pagedFind<T>({
  unsecuredSavedObjectsClient,
  type,
  filter,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  type: string;
  filter?: string;
}): AsyncGenerator<Array<SavedObject<T>>> {
  let page = 1;
  while (true) {
    const res = await unsecuredSavedObjectsClient.find<T>({
      type,
      page,
      perPage: PAGE_SIZE,
      namespaces: ['*'],
      filter,
      sortField: 'updated_at',
      sortOrder: 'asc',
    });
    if (res.saved_objects.length === 0) {
      return;
    }
    yield res.saved_objects;
    if (res.saved_objects.length < PAGE_SIZE) {
      return;
    }
    page += 1;
  }
}
