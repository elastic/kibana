/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import type { AlertingV2ErrorCode } from '../../errors/error_codes';

interface NoOpConflictParams {
  code: AlertingV2ErrorCode;
  message: string;
  groupHash: string;
  /** Set by the alert-scoped actions; series-scoped actions target no single alert. */
  alertId?: string;
  actionType: AlertEpisodeActionType;
  /** Extra context for the failing precondition, merged into `details`. */
  details?: Record<string, unknown>;
}

/**
 * The 409 every preconditioned alert action raises when the write it was
 * asked for would not change the alert's state. Returned rather than thrown
 * so the call site reads as a `throw`, and so the single path (which lets it
 * reach the route) and the bulk path (which records it in `errors[]`) see one
 * error shape.
 */
export const noOpConflict = ({
  code,
  message,
  groupHash,
  alertId,
  actionType,
  details,
}: NoOpConflictParams): Boom.Boom =>
  Boom.conflict(message, {
    code,
    details: {
      group_hash: groupHash,
      ...(alertId != null ? { alert_id: alertId } : {}),
      action_type: actionType,
      ...details,
    },
  });
