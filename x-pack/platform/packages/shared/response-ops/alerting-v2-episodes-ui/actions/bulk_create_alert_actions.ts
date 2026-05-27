/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { BulkCreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';

export interface BulkCreateAlertActionsResponse {
  processed: number;
  total: number;
}

export const bulkCreateAlertActions = (
  http: HttpStart,
  items: BulkCreateAlertActionBody
): Promise<BulkCreateAlertActionsResponse> =>
  http.post<BulkCreateAlertActionsResponse>(`${ALERTING_V2_ALERT_API_PATH}/_bulk_action`, {
    body: JSON.stringify(items),
  });
