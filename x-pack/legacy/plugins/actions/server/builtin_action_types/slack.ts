/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { IncomingWebhook } from '@slack/webhook';

import { ActionType, ActionTypeExecutorOptions, ExecutorType } from '../types';

const CONFIG_SCHEMA = Joi.object()
  .keys({
    webhookUrl: Joi.string().required(),
  })
  .required();

const PARAMS_SCHEMA = Joi.object()
  .keys({
    message: Joi.string().required(),
  })
  .required();

// customizing executor is only used for tests
export function getActionType({ executor }: { executor?: ExecutorType } = {}): ActionType {
  if (executor == null) executor = slackExecutor;

  return {
    id: '.slack',
    name: 'slack',
    unencryptedAttributes: [],
    validate: {
      params: PARAMS_SCHEMA,
      config: CONFIG_SCHEMA,
    },
    executor,
  };
}

// the production executor for this action
export const actionType = getActionType();

async function slackExecutor({
  config,
  params,
  services,
}: ActionTypeExecutorOptions): Promise<any> {
  const { webhookUrl } = config;
  const { message } = params;

  const webhook = new IncomingWebhook(webhookUrl);

  return await webhook.send(message);
}
