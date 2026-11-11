/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  BulkAckEpisodeActionBody,
  BulkResponse,
  CreateActivateEpisodeActionBody,
} from '@kbn/alerting-v2-schemas';
import { COMMON_HEADERS } from '../constants';
import {
  BULK_ACK_EPISODE_ACTION_URL,
  getAckEpisodeActionUrl,
  getActivateEpisodeActionUrl,
} from '../urls';

export interface ActivateAlertActionParams extends CreateActivateEpisodeActionBody {
  /** The id of the alert episode to activate. */
  episodeId: string;
}

export interface AckAlertActionParams {
  /** The id of the alert episode to acknowledge. */
  episodeId: string;
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
   * Hits `POST /api/alerting/v2/alerts/{alertId}/_activate`. The route
   * returns 204 on success.
   */
  activate: (params: ActivateAlertActionParams) => Promise<void>;
  /**
   * Hits `POST /api/alerting/v2/alerts/{alertId}/_ack`. The route returns 204
   * on success.
   */
  ack: (params: AckAlertActionParams) => Promise<void>;
  /**
   * Hits `POST /api/alerting/v2/alerts/_bulk_ack`. The route returns the bulk
   * result, including actions that failed their precondition.
   */
  bulkAck: (body: BulkAckEpisodeActionBody) => Promise<BulkResponse>;
}

export const getAlertActionsApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): AlertActionsApiService => ({
  activate: ({ episodeId, ...body }) =>
    measurePerformanceAsync(log, 'alertActions.activate', async () => {
      await kbnClient.request({
        method: 'POST',
        path: getActivateEpisodeActionUrl(episodeId),
        headers: COMMON_HEADERS,
        body,
      });
    }),
  ack: ({ episodeId }) =>
    measurePerformanceAsync(log, 'alertActions.ack', async () => {
      await kbnClient.request({
        method: 'POST',
        path: getAckEpisodeActionUrl(episodeId),
        headers: COMMON_HEADERS,
        body: {},
      });
    }),
  bulkAck: (body) =>
    measurePerformanceAsync(log, 'alertActions.bulkAck', async () => {
      const response = await kbnClient.request<BulkResponse>({
        method: 'POST',
        path: BULK_ACK_EPISODE_ACTION_URL,
        headers: COMMON_HEADERS,
        body,
      });
      return response.data;
    }),
});
