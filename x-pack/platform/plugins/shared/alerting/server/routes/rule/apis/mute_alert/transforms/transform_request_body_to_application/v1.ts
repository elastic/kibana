/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeCondition } from '@kbn/alerting-types';
import type { MuteAlertRequestBodyV1 } from '@kbn/alerting-plugin/common/routes/rule/apis/mute_alert';

export const transformRequestBodyToApplication = (
  body?: MuteAlertRequestBodyV1
): {
  expiresAt?: string;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
} => {
  if (!body) {
    return {};
  }

  return {
    ...(body.expires_at ? { expiresAt: body.expires_at } : {}),
    ...(body.conditions
      ? {
          conditions: body.conditions.map((c) => ({
            type: c.type,
            field: c.field,
            ...(c.value ? { value: c.value } : {}),
            ...(c.snapshot_value ? { snapshotValue: c.snapshot_value } : {}),
          })),
        }
      : {}),
    ...(body.condition_operator ? { conditionOperator: body.condition_operator } : {}),
  };
};
