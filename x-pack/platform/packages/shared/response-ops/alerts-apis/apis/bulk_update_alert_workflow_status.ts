/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';

const BULK_UPDATE_PATH = '/internal/rac/alerts/bulk_update';

export interface BulkUpdateAlertWorkflowStatusParams {
  http: HttpStart;
  ids: string[];
  status: string;
  index: string;
}

/** Updates the workflow status of one or more alerts by ID. */
export const bulkUpdateAlertWorkflowStatus = ({
  http,
  ids,
  status,
  index,
}: BulkUpdateAlertWorkflowStatusParams): Promise<unknown> =>
  http.post(BULK_UPDATE_PATH, {
    body: JSON.stringify({ ids, status, index }),
  });
