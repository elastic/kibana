/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkMuteAlertsParams } from '../../../../../../../server/application/rule/methods/bulk_mute_alerts/types';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../..';

export const transformBulkMuteUnmuteAlertsBody = (
  body: BulkMuteUnmuteAlertsRequestBodyV1
): BulkMuteAlertsParams['rules'] => {
  return body.rules.map(({ rule_id: id, alert_instance_ids: alertInstanceIds }) => ({
    id,
    alertInstanceIds,
  }));
};
