/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';
import {
  successResult,
  errorResult,
  errorResultWithStaticMessage,
  retryResult,
  retryResultSeconds,
  getRetryAfterIntervalFromHeaders,
} from './lib/action_executor_result';

import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../types';

// secrets definition

export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchema = schema.object({
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
    validate: {
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    executor,
  };
}

// the production executor for this action
export const actionType = getActionType();

// action executor
const ACTION_DESCRIPTION = 'posting a slack message';
enum ACTION_I18N_IDENTIFIERS {
  POSTING_ERROR = 'slack.errorPostingErrorMessage',
  RETRY_LATER_ERROR = 'slack.errorPostingRetryLaterErrorMessage',
  RETRY_LATER_DATE_ERROR = 'slack.errorPostingRetryDateErrorMessage',
  UNEXPECTED_NULL_ERROR = 'slack.unexpectedNullResponseErrorMessage',
  UNEXPECTED_TEXT_ERROR = 'slack.unexpectedTextResponseErrorMessage',
}
async function slackExecutor(
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const id = execOptions.id;
  const secrets = execOptions.secrets as ActionTypeSecretsType;
  const params = execOptions.params as ActionParamsType;

  let result: IncomingWebhookResult;
  const { webhookUrl } = secrets;
  const { message } = params;

  try {
    const webhook = new IncomingWebhook(webhookUrl);
    result = await webhook.send(message);
  } catch (err) {
    if (err.original == null || err.original.response == null) {
      return errorResult(
        id,
        err.message,
        ACTION_DESCRIPTION,
        ACTION_I18N_IDENTIFIERS.POSTING_ERROR
      );
    }

    const { status, statusText, headers } = err.original.response;

    // special handling for 5xx
    if (status >= 500) {
      return retryResult(
        id,
        err.message,
        ACTION_DESCRIPTION,
        ACTION_I18N_IDENTIFIERS.RETRY_LATER_ERROR
      );
    }

    // special handling for rate limiting
    if (status === 429) {
      return retryResultSeconds(
        id,
        err.message,
        ACTION_DESCRIPTION,
        ACTION_I18N_IDENTIFIERS.RETRY_LATER_DATE_ERROR,
        getRetryAfterIntervalFromHeaders(headers)
      );
    }

    return errorResult(
      id,
      `${err.message} - ${statusText}`,
      ACTION_DESCRIPTION,
      ACTION_I18N_IDENTIFIERS.POSTING_ERROR
    );
  }

  if (result == null) {
    return errorResultWithStaticMessage(
      id,
      'unexpected null response from slack',
      ACTION_I18N_IDENTIFIERS.UNEXPECTED_NULL_ERROR
    );
  }

  if (result.text !== 'ok') {
    return errorResultWithStaticMessage(
      id,
      'unexpected text response from slack',
      ACTION_I18N_IDENTIFIERS.UNEXPECTED_TEXT_ERROR
    );
  }

  return successResult(result);
}
