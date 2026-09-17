/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';

const BULK_UPDATE_TAGS_PATH = '/internal/rac/alerts/tags';

export interface BulkUpdateAlertTagsParams {
  http: HttpStart;
  alertIds: string[];
  index: string;
  add?: string[];
  remove?: string[];
}

/** Updates workflow tags on one or more alerts by ID. */
export const bulkUpdateAlertTags = ({
  http,
  alertIds,
  index,
  add,
  remove,
}: BulkUpdateAlertTagsParams): Promise<unknown> =>
  http.post(BULK_UPDATE_TAGS_PATH, {
    body: JSON.stringify({
      alertIds,
      index,
      ...(add?.length ? { add } : {}),
      ...(remove?.length ? { remove } : {}),
    }),
  });
