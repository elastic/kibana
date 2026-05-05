/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createDeactivateAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import { createAlertActionRouteForType } from './create_alert_action_route_for_type';

export const CreateDeactivateAlertActionRoute = createAlertActionRouteForType({
  actionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
  pathSuffix: '_deactivate',
  bodySchema: createDeactivateAlertActionBodySchema,
});
