/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MuteAlertBody } from '../../../../../../application/rule/methods/mute_alert/types';
import type { SnoozeAlertRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/snooze_alert';

export const transformRequestBodyToApplication = (
  body: SnoozeAlertRequestBodyV1
): MuteAlertBody => ({
  expiresAt: body.expires_at,
  conditions: body.conditions,
  conditionOperator: body.condition_operator,
});
