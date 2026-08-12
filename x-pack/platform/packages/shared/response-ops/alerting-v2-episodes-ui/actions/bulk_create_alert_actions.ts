/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type {
  BulkCreateEpisodeAlertActionBody,
  BulkCreateSeriesAlertActionBody,
  BulkResponse,
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_EPISODES_API_PATH,
  ALERTING_V2_SERIES_API_PATH,
} from '@kbn/alerting-v2-constants';

export const bulkCreateSeriesAlertActions = (
  http: HttpStart,
  items: BulkCreateSeriesAlertActionBody
): Promise<BulkResponse> =>
  http.post<BulkResponse>(`${ALERTING_V2_SERIES_API_PATH}/_bulk_action`, {
    body: JSON.stringify(items),
  });

export const bulkCreateEpisodeAlertActions = (
  http: HttpStart,
  items: BulkCreateEpisodeAlertActionBody
): Promise<BulkResponse> =>
  http.post<BulkResponse>(`${ALERTING_V2_EPISODES_API_PATH}/_bulk_action`, {
    body: JSON.stringify(items),
  });
