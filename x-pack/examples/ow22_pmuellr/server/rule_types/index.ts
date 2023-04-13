/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { getRuleTypeSql } from './sql_rule';
import { getRuleTypeWebhook } from './webhook_rule';

import { PluginSetupContract as AlertingSetup } from '../../../../plugins/alerting/server';

export function registerRuleTypes(logger: Logger, alerting: AlertingSetup) {
  alerting.registerType(getRuleTypeSql(logger));
  alerting.registerType(getRuleTypeWebhook(logger));
}
