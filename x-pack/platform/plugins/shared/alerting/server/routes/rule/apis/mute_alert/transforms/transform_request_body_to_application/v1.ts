/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MuteAlertQuery } from '../../../../../../application/rule/methods/mute_alert/types';
import type { MuteAlertRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/mute_alert';

/**
 * Transforms the snake_case request body into camelCase application-layer fields
 * that can be merged into the MuteAlertQuery passed to muteInstance().
 */
export const transformRequestBodyToApplication = (
  body?: MuteAlertRequestBodyV1
): Partial<MuteAlertQuery> => {
  if (!body) {
    return {};
  }

  return {
    ...(body.expires_at != null ? { expiresAt: body.expires_at } : {}),
    ...(body.conditions != null
      ? {
          conditions: body.conditions.map((c) => ({
            type: c.type,
            field: c.field,
            ...(c.value != null ? { value: c.value } : {}),
            ...(c.snapshot_value != null ? { snapshotValue: c.snapshot_value } : {}),
          })),
        }
      : {}),
    ...(body.condition_operator != null
      ? { conditionOperator: body.condition_operator }
      : {}),
  };
};
