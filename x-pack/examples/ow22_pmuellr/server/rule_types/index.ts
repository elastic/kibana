/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeSql } from './sql_rule';
import { ruleTypeWebhook } from './webhook_rule';

// export { ruleTypeSql } from './sql_rule';
// export { ruleTypeWebhook } from './webhook_rule';

import { PluginSetupContract as AlertingSetup } from '../../../../plugins/alerting/server';

export function registerRuleTypes(alerting: AlertingSetup) {
  alerting.registerType(ruleTypeSql);
  alerting.registerType(ruleTypeWebhook);
}
