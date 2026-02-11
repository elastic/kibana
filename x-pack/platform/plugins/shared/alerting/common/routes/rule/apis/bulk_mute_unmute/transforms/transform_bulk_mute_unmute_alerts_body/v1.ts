/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkMuteUnmuteAlertsParams } from '../../../../../../../server/application/rule/types';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../..';

export const transformBulkMuteUnmuteAlertsBody = (
  body: BulkMuteUnmuteAlertsRequestBodyV1
): BulkMuteUnmuteAlertsParams['rules'] => {
  return body.rules.map(({ rule_id: id, alert_instance_ids: alertInstanceIds }) => ({
    id,
    alertInstanceIds,
  }));
};
