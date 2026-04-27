/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { probeViewSupport } from './probe';
import { ViewSyncService } from './view_sync_service';

export type AnalyticsMode = 'views' | 'indices';

export interface StartViewsPathArgs {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  /** From `xpack.cases.analytics.views.enabled`. */
  viewsConfigEnabled: boolean;
}

export interface StartViewsPathResult {
  mode: AnalyticsMode;
  viewSyncService: ViewSyncService | null;
}

/**
 * Decides whether plugin start should run the views path or fall back to
 * the legacy analytics-indices path. On `views`, instantiates the sync
 * service and kicks off the initial regenerate so the views are present
 * before the first SO write arrives.
 */
export const startViewsPath = async ({
  esClient,
  savedObjectsClient,
  logger,
  viewsConfigEnabled,
}: StartViewsPathArgs): Promise<StartViewsPathResult> => {
  if (!viewsConfigEnabled) {
    logger.debug('Cases analytics views disabled by config; using legacy indices path');
    return { mode: 'indices', viewSyncService: null };
  }

  const supported = await probeViewSupport(esClient, logger);
  if (!supported) {
    return { mode: 'indices', viewSyncService: null };
  }

  const viewSyncService = new ViewSyncService({ esClient, savedObjectsClient, logger });
  // Kick off the initial regenerate but do not block plugin start on it —
  // a slow ES means a slow plugin start, and the templates client write
  // path will re-trigger regeneration on the first write anyway.
  void viewSyncService.regenerateNow();

  logger.info('Cases analytics ES|QL views path active (9 views, regenerated on template writes)');
  return { mode: 'views', viewSyncService };
};

export type { ViewSyncService } from './view_sync_service';
export type { ViewSyncStatus } from './view_sync_service';
