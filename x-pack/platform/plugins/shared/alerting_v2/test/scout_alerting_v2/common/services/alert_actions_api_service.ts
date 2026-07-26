/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { CreateActivateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { COMMON_HEADERS } from '../constants';
import { getActivateAlertActionUrl } from '../urls';

export interface ActivateAlertActionParams extends CreateActivateAlertActionBody {
  /** The group hash of the alert episode to activate. */
  groupHash: string;
}

/**
 * Test-time client for the alerting_v2 `.alert-actions` HTTP surface. Only
 * the routes we consume from tests live here — grow the surface on demand
 * rather than mirroring every route up front.
 *
 * For direct data-stream access (seeding audit rows, asserting on persisted
 * documents, wiping the stream between tests), use
 * {@link AlertActionsEventsService} instead.
 */
export interface AlertActionsApiService {
  /**
   * Hits `POST /api/alerting_v2/alerts/{groupHash}/_activate`. The route
   * returns 204 on success.
   */
  activate: (params: ActivateAlertActionParams) => Promise<void>;
}

export const getAlertActionsApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): AlertActionsApiService => ({
  activate: ({ groupHash, ...body }) =>
    measurePerformanceAsync(log, 'alertActions.activate', async () => {
      await kbnClient.request({
        method: 'POST',
        path: getActivateAlertActionUrl(groupHash),
        headers: COMMON_HEADERS,
        body,
      });
    }),
});
