/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';

import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../types';

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

async function slackExecutor(
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const config = execOptions.config as ActionTypeConfigType;
  const params = execOptions.params as ActionParamsType;

  let result: IncomingWebhookResult;
  const { webhookUrl } = config;
  const { message } = params;

  try {
    const webhook = new IncomingWebhook(webhookUrl);
    result = await webhook.send(message);
  } catch (err) {
    if (err.original == null || err.original.response == null) {
      return errorResult(err.message);
    }

    const { status, statusText, headers } = err.original.response;

    // special handling for 5xx
    if (status >= 500) {
      return retryResult(err.message);
    }

    // special handling for rate limiting
    if (status === 429) {
      const retryAfterString = headers['retry-after'];
      if (retryAfterString != null) {
        const retryAfter = parseInt(retryAfterString, 10);
        if (!isNaN(retryAfter)) {
          return retryResultSeconds(err.message, retryAfter);
        }
      }
    }

    return errorResult(`${err.message} - ${statusText}`);
  }

  if (result == null) {
    return errorResult(`unexpected null response from slack`);
  }

  if (result.text !== 'ok') {
    return errorResult(`unexpected text response from slack (expecting 'ok')`);
  }

  return successResult(result);
}

function successResult(data: any): ActionTypeExecutorResult {
  return { status: 'ok', data };
}

function errorResult(message: string): ActionTypeExecutorResult {
  return {
    status: 'error',
    message: `an error occurred posting a slack message: ${message}`,
  };
}

function retryResult(message: string): ActionTypeExecutorResult {
  return {
    status: 'error',
    message: `an error occurred posting a slack message, retrying later`,
    retry: true,
  };
}

function retryResultSeconds(message: string, retryAfter: number = 60): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  return {
    status: 'error',
    message: `an error occurred posting a slack message, retry at ${retryString}: ${message}`,
    retry,
  };
}
