/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MuteInstances } from '../../../alerts_service/alerts_service';
import type { BulkMuteUnmuteAlertsParams } from '../types';

export const transformParamsRulesToAlertInstances = (
  rules: BulkMuteUnmuteAlertsParams['rules']
): MuteInstances => {
  const alertInstances: MuteInstances = [];

  for (const rule of rules) {
    if (rule.alertInstanceIds && rule.alertInstanceIds.length > 0) {
      alertInstances.push({
        ruleId: rule.id,
        alertInstanceIds: rule.alertInstanceIds,
      });
    }
  }

  return alertInstances;
};
