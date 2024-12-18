/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { KueryNode } from '@kbn/es-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { BulkEditResponse } from '../../../types';

export async function unsnoozeRule({
  id,
  http,
  scheduleIds,
}: {
  id: string;
  http: HttpSetup;
  scheduleIds?: string[];
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_unsnooze`, {
    body: JSON.stringify({
      schedule_ids: scheduleIds,
    }),
  });
}

export interface BulkUnsnoozeRulesProps {
  ids?: string[];
  filter?: KueryNode | null | undefined;
  scheduleIds?: string[];
}

export function bulkUnsnoozeRules({
  ids,
  filter,
  scheduleIds,
  http,
}: BulkUnsnoozeRulesProps & { http: HttpSetup }): Promise<BulkEditResponse> {
  let body: string;
  try {
    body = JSON.stringify({
      ids: ids?.length ? ids : undefined,
      ...(filter ? { filter: JSON.stringify(filter) } : {}),
      operations: [
        {
          operation: 'delete',
          field: 'snoozeSchedule',
          value: scheduleIds,
        },
      ],
    });
  } catch (e) {
    throw new Error(`Unable to parse bulk unsnooze params: ${e}`);
  }
  return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`, { body });
}
