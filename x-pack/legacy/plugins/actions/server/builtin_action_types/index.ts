/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../action_type_registry';
import { ActionsConfigurationUtilities } from '../actions_config';
import { Logger } from '../../../../../../src/core/server';

import { getActionType as getServerLogActionType } from './server_log';
import { getActionType as getSlackActionType } from './slack';
import { getActionType as getEmailActionType } from './email';
import { getActionType as getIndexActionType } from './es_index';
import { getActionType as getPagerDutyActionType } from './pagerduty';
import { getActionType as getWebhookActionType } from './webhook';

export function registerBuiltInActionTypes({
  logger,
  actionTypeRegistry,
  actionsConfigUtils: configurationUtilities,
}: {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistry;
  actionsConfigUtils: ActionsConfigurationUtilities;
}) {
  actionTypeRegistry.register(getServerLogActionType({ logger }));
  actionTypeRegistry.register(getSlackActionType({ configurationUtilities }));
  actionTypeRegistry.register(getEmailActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getIndexActionType({ logger }));
  actionTypeRegistry.register(getPagerDutyActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getWebhookActionType({ logger, configurationUtilities }));
}
