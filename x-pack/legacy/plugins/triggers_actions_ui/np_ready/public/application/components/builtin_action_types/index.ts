/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionType as getServerLogActionType } from './server_log';
import { getActionType as getSlackActionType } from './slack';
import { getActionType as getEmailActionType } from './email';
import { getActionType as getIndexActionType } from './es_index';
import { getActionType as getPagerDutyActionType } from './pagerduty';
import { getActionType as getWebhookActionType } from './webhook';
import { TypeRegistry } from '../../type_registry';
import { ActionTypeModel } from '../../../types';

export function registerBuiltInActionTypes({
  actionTypeRegistry,
}: {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}) {
  actionTypeRegistry.register(getServerLogActionType());
  actionTypeRegistry.register(getSlackActionType());
  actionTypeRegistry.register(getEmailActionType());
  actionTypeRegistry.register(getIndexActionType());
  actionTypeRegistry.register(getPagerDutyActionType());
  actionTypeRegistry.register(getWebhookActionType());
}
