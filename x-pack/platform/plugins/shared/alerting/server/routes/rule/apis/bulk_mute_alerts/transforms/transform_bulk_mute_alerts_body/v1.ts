/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/bulk_mute_unmute';

export const transformBulkMuteAlertsBody = (
  body: BulkMuteUnmuteAlertsRequestBodyV1
): Record<string, string[]> => {
  return body.reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.rule_id]) {
      acc[item.rule_id] = [];
    }
    acc[item.rule_id].push(item.alert_instance_id);
    return acc;
  }, {});
};
