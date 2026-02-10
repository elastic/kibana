/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { MuteCondition } from '@kbn/alerting-types';
import { BASE_ALERTING_API_PATH } from '../constants';

export interface MuteAlertInstanceParams {
  id: string;
  instanceId: string;
  http: HttpStart;
  /** ISO timestamp; when reached the mute expires automatically. */
  expiresAt?: string;
  /** Conditions under which the mute is automatically lifted. */
  conditions?: MuteCondition[];
  /** How conditions combine: 'any' = OR, 'all' = AND. Default 'any'. */
  conditionOperator?: 'any' | 'all';
}

export const muteAlertInstance = ({
  id,
  instanceId,
  http,
  expiresAt,
  conditions,
  conditionOperator,
}: MuteAlertInstanceParams) => {
  const hasBody = expiresAt || (conditions && conditions.length > 0);
  const body = hasBody
    ? JSON.stringify({
        ...(expiresAt ? { expires_at: expiresAt } : {}),
        ...(conditions && conditions.length > 0
          ? {
              conditions: conditions.map((c) => ({
                type: c.type,
                field: c.field,
                ...(c.value != null ? { value: c.value } : {}),
                ...(c.snapshotValue != null ? { snapshot_value: c.snapshotValue } : {}),
              })),
            }
          : {}),
        ...(conditionOperator ? { condition_operator: conditionOperator } : {}),
      })
    : undefined;

  return http.post<void>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/alert/${encodeURIComponent(
      instanceId
    )}/_mute`,
    body ? { body } : undefined
  );
};
