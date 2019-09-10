/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../action_type_registry';

import { actionType as serverLogActionType } from './server_log';
import { actionType as slackActionType } from './slack';
import { actionType as emailActionType } from './email';
import { actionType as indexActionType } from './es_index';
import { actionType as pagerDutyActionType } from './pagerduty';

export function registerBuiltInActionTypes(actionTypeRegistry: ActionTypeRegistry) {
  actionTypeRegistry.register(serverLogActionType);
  actionTypeRegistry.register(slackActionType);
  actionTypeRegistry.register(emailActionType);
  actionTypeRegistry.register(indexActionType);
  actionTypeRegistry.register(pagerDutyActionType);
}
