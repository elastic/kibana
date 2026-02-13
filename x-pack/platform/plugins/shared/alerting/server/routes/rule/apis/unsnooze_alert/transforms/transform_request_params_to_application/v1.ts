/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnsnoozeAlertRequestParamsV1 } from '../../../../../../../common/routes/rule/apis/unsnooze_alert';

export const transformRequestParamsToApplication = (
  params: UnsnoozeAlertRequestParamsV1
): { ruleId: string; alertInstanceId: string } => ({
  ruleId: params.rule_id,
  alertInstanceId: params.alert_id,
});
