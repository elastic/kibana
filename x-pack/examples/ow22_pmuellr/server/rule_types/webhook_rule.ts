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
  WebhookRuleName,
} from '../../common';

import { validatePostWebhookRuleExampleResponseBody } from '../routes/route_schema_schema';
import { PostWebhookRuleExampleRequestBody } from '../routes/route_schema_types';

type Params = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  url: schema.string(),
});

interface ActionContext extends AlertInstanceContext {
  message: string;
}

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
  const ruleData: PostWebhookRuleExampleRequestBody = {
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

  const ruleResponse = validatePostWebhookRuleExampleResponseBody(data);

  const { alertFactory } = options.services;
  for (const alertData of ruleResponse.instances) {
    const alert = alertFactory.create(alertData.instanceId);
    const groupContext = alertData.context;
    const group = alertData.actionGroup;

    if (group !== 'found') {
      logger.warn(`rule attempted to set unexpected group "${group}"`);
    } else {
      alert.scheduleActions(group, groupContext[group]);
    }
  }

  return ruleResponse.state;
}
