/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface BulkUntrackAlertsParams {
  http: HttpStart;
  indices: string[];
  alertUuids: string[];
}

/** Untracks one or more alerts by UUID. */
export const bulkUntrackAlerts = ({
  http,
  indices,
  alertUuids,
}: BulkUntrackAlertsParams): Promise<void> =>
  http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`, {
    body: JSON.stringify({
      indices,
      alert_uuids: alertUuids,
    }),
  });
