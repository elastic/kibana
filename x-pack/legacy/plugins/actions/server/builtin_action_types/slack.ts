/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { IncomingWebhook } from '@slack/webhook';

import { ActionType, ActionTypeExecutorOptions } from '../types';

// TODO: figure out the right way type-safe way to mock slack's IncomingWebhook class
let IncomingWebhookImpl: any = IncomingWebhook;

// for testing
export function setIncomingWebhookImpl(incomingWebHook: any = IncomingWebhook): void {
  IncomingWebhookImpl = incomingWebHook;
}

const CONFIG_SCHEMA = Joi.object().keys({
  webhookUrl: Joi.string().required(),
});

const PARAMS_SCHEMA = Joi.object().keys({
  message: Joi.string().required(),
});

export const actionType: ActionType = {
  id: 'kibana.slack',
  name: 'slack',
  unencryptedAttributes: [],
  validate: {
    params: PARAMS_SCHEMA,
    config: CONFIG_SCHEMA,
  },
  executor,
};

async function executor({ config, params, services }: ActionTypeExecutorOptions): Promise<any> {
  const { webhookUrl } = config;
  const { message } = params;

  // TODO: do we need an agent for proxy access?
  const webhook = new IncomingWebhookImpl(webhookUrl);

  // TODO: should we have a standardized response for executor?
  return await webhook.send(message);
}
