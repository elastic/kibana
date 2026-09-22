/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createAckAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import { createAckAlertActionOasExamples } from './create_ack_alert_action_oas_example';
import { createAlertActionRouteForType } from './create_alert_action_route_for_type';

export const CreateAckAlertActionRoute = createAlertActionRouteForType({
  actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
  pathSuffix: '_ack',
  summary: 'Acknowledge an alert',
  bodySchema: createAckAlertActionBodySchema,
  oasOperationObject: createAckAlertActionOasExamples,
});
