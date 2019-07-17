/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook } from '@slack/webhook';

import { ActionType, ActionTypeExecutorOptions, ExecutorType } from '../types';

// config definition

const unencryptedConfigProperties: string[] = [];

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchema = schema.object({
  webhookUrl: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string(),
});

// action type definition

// customizing executor is only used for tests
export function getActionType({ executor }: { executor?: ExecutorType } = {}): ActionType {
  if (executor == null) executor = slackExecutor;

  return {
    id: '.slack',
    name: 'slack',
    unencryptedAttributes: unencryptedConfigProperties,
    validate: {
      config: ConfigSchema,
      params: ParamsSchema,
    },
    executor,
  };
}

// the production executor for this action
export const actionType = getActionType();

// action executor

async function slackExecutor(execOptions: ActionTypeExecutorOptions): Promise<any> {
  const config = execOptions.config as ActionTypeConfigType;
  const params = execOptions.params as ActionParamsType;

  const webhook = new IncomingWebhook(config.webhookUrl);

  return await webhook.send(params.message);
}
