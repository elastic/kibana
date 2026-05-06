/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CasesAnalyticsWriterContract } from '../writer';
import { runReconciliation } from '../reconciliation/runner';

/**
 * One-shot historical backfill — reuses the reconciliation runner with a `null`
 * watermark so it walks every case + user-action SO across all spaces.
 *
 * Designed to be invoked manually (e.g. via an internal route) when a tenant
 * upgrades from a build that didn't have the writer to one that does. After the
 * first successful run, the steady-state reconciliation task takes over.
 *
 * POC scope: not wired to a route yet. Exposed as a function so it can be invoked
 * from a test, a one-off ops script, or a future internal endpoint.
 */
export const runHistoricalBackfill = async ({
  logger,
  internalSavedObjectsRepository,
  unsecuredSavedObjectsClient,
  writer,
}: {
  logger: Logger;
  internalSavedObjectsRepository: Parameters<
    typeof runReconciliation
  >[0]['internalSavedObjectsRepository'];
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsWriterContract;
}): Promise<void> => {
  logger.info('cases.analytics: starting historical backfill');
  await runReconciliation({
    logger,
    internalSavedObjectsRepository,
    unsecuredSavedObjectsClient,
    writer,
  });
  logger.info('cases.analytics: historical backfill complete');
};
