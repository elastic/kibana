/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../../../../../common/routes/rule/apis/bulk_mute_unmute';

export const MAX_MUTE_INSTANCES = 100;

export const validateMaxMuteUnmuteInstances = (body: BulkMuteUnmuteAlertsRequestBodyV1) => {
  if (getTotalAlertInstances(body) > MAX_MUTE_INSTANCES) {
    throw Boom.badRequest(
      `The total number of alert instances to mute cannot exceed ${MAX_MUTE_INSTANCES}.`
    );
  }
};

const getTotalAlertInstances = (body: BulkMuteUnmuteAlertsRequestBodyV1): number => {
  return body.rules.reduce((acc, rule) => acc + rule.alert_instance_ids.length, 0);
};
