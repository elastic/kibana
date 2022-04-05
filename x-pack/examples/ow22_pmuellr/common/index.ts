/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PluginId = 'Ow22pmuellr';
export const AppId = PluginId;

export const AppTitle = 'On-Week 2022 - Patrick Mueller';
export const AppDescription = 'goodies from On Week 2022 by Patrick Mueller';

export const RuleProducer = 'AlertingExample'; // from examples/alerting_example

export const SqlRuleId = 'ow22-sql';
export const SqlRuleActionGroupId = 'found';
export const SqlRuleName = 'SQL query';
export const SqlRuleDescription =
  'Alerting rule that runs an sql query and creates alerts from returned rows.';

export const WebhookRuleId = 'ow22-webhook';
export const WebhookRuleActionGroupId = 'found';
export const WebhookRuleName = 'Webhook';
export const WebhookRuleDescription = 'Alerting rule that runs the rule via a webhook.';
