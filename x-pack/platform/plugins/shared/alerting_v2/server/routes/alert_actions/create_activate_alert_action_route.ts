/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createActivateAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import {
  CREATE_ACTIVATE_ALERT_ACTION_SUMMARY,
  createActivateAlertActionOasExamples,
} from './alert_oas_examples';
import { createAlertActionRouteForType } from './create_alert_action_route_for_type';

export const CreateActivateAlertActionRoute = createAlertActionRouteForType({
  actionType: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
  pathSuffix: '_activate',
  summary: CREATE_ACTIVATE_ALERT_ACTION_SUMMARY,
  bodySchema: createActivateAlertActionBodySchema,
  oasOperationObject: createActivateAlertActionOasExamples,
});
