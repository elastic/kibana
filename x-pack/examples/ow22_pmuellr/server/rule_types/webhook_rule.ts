/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'https';
import axios from 'axios';

import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from 'kibana/server';

import {
  RuleType,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../plugins/alerting/server';

import {
  RuleProducer,
  WebhookRuleId,
  WebhookRuleActionGroupId,
  WebhookRuleRequest,
  WebhookRuleName,
} from '../../common';

type Params = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  url: schema.string(),
});

interface ActionContext extends AlertInstanceContext {
  message: string;
}

const ruleResponseSchema = schema.object({
  state: schema.recordOf(schema.string(), schema.any()),
  instances: schema.recordOf(schema.string(), schema.recordOf(schema.string(), schema.any())),
});

type WebhookRuleType = RuleType<
  Params,
  never,
  {},
  {},
  ActionContext,
  typeof WebhookRuleActionGroupId
>;

type ExecutorOptions = AlertExecutorOptions<
  Params,
  {},
  {},
  ActionContext,
  typeof WebhookRuleActionGroupId
>;

export function getRuleTypeWebhook(logger: Logger): WebhookRuleType {
  return {
    id: WebhookRuleId,
    name: WebhookRuleName,
    actionGroups: [{ id: WebhookRuleActionGroupId, name: WebhookRuleActionGroupId }],
    executor: (options: ExecutorOptions) => executor(logger, options),
    defaultActionGroupId: WebhookRuleActionGroupId,
    validate: {
      params: ParamsSchema,
    },
    actionVariables: {
      context: [{ name: 'message', description: 'A pre-constructed message for the alert.' }],
      params: [{ name: 'url', description: 'url of webhook.' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    producer: RuleProducer,
    doesSetRecoveryContext: true,
  };
}

async function executor(logger: Logger, options: ExecutorOptions) {
  const url = options.params.url;
  const headers = { 'kbn-xsrf': 'foo' };
  const ruleData: WebhookRuleRequest = {
    ruleId: options.alertId,
    executionId: options.executionId,
    params: options.params,
    state: options.state,
  };

  const axiosInstance = axios.create({
    httpsAgent: new Agent({
      rejectUnauthorized: false,
    }),
  });

  const response = await axiosInstance.post(url, ruleData, { headers, validateStatus: null });

  const { status, data } = response;
  if (status !== 200) {
    throw new Error(`webhook returned status ${status}: ${JSON.stringify(data)}`);
  }

  const ruleResponse = ruleResponseSchema.validate(data);

  const { alertFactory } = options.services;
  for (const alertId of Object.keys(ruleResponse.instances)) {
    const alert = alertFactory.create(alertId);
    const groupContext = ruleResponse.instances[alertId];
    for (const group of Object.keys(groupContext)) {
      if (group !== 'found') {
        logger.warn(`rule attempted to set unexpected group "${group}"`);
      } else {
        alert.scheduleActions(group, groupContext[group]);
      }
    }
  }

  return ruleResponse.state;
}
