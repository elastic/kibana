/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MuteAlertRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/mute_alert';
import type { MuteAlertBody } from '../../../../../../application/rule/methods/mute_alert/types';

export const transformRequestBodyToApplication = (
  body: MuteAlertRequestBodyV1 | undefined
): MuteAlertBody | undefined => {
  if (body == null) return undefined;
  return {
    ...(body.expires_at !== undefined ? { expiresAt: body.expires_at } : {}),
    ...(body.conditions?.length
      ? {
          conditions: body.conditions.map((c) => ({
            type: c.type,
            field: c.field,
            ...(c.value !== undefined ? { value: c.value } : {}),
            ...(c.snapshot_value !== undefined ? { snapshotValue: c.snapshot_value } : {}),
          })),
        }
      : {}),
    ...(body.condition_operator !== undefined
      ? { conditionOperator: body.condition_operator }
      : {}),
  };
};
