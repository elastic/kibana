/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';

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
export function getActionType(
  { executor }: { executor: ExecutorType } = { executor: slackExecutor }
): ActionType {
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

// action executor

async function slackExecutor(
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
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
      return serviceErrorResult(actionId, err.message);
    }

    const { status, statusText, headers } = err.original.response;

    // special handling for 5xx
    if (status >= 500) {
      return retryResult(actionId, err.message);
    }

    // special handling for rate limiting
    if (status === 429) {
      return pipe(
        getRetryAfterIntervalFromHeaders(headers),
        map(retry => retryResultSeconds(actionId, err.message, retry)),
        getOrElse(() => retryResult(actionId, err.message))
      );
    }

    const errMessage = i18n.translate(
      'xpack.actions.builtin.slack.unexpectedHttpResponseErrorMessage',
      {
        defaultMessage: 'unexpected http response from slack: {httpStatus} {httpStatusText}',
        values: {
          httpStatus: status,
          httpStatusText: statusText,
        },
      }
    );
    return errorResult(actionId, errMessage);
  }

  if (result == null) {
    const errMessage = i18n.translate(
      'xpack.actions.builtin.slack.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from slack',
      }
    );
    return errorResult(actionId, errMessage);
  }

  if (result.text !== 'ok') {
    return serviceErrorResult(actionId, result.text);
  }

  return successResult(actionId, result);
}

function successResult(actionId: string, data: any): ActionTypeExecutorResult {
  return { status: 'ok', data, actionId };
}

function errorResult(actionId: string, message: string): ActionTypeExecutorResult {
  return {
    status: 'error',
    message,
    actionId,
  };
}
function serviceErrorResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.slack.errorPostingErrorMessage', {
    defaultMessage: 'error posting slack message',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function retryResult(actionId: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.slack.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
  };
}

function retryResultSeconds(
  actionId: string,
  message: string,
  retryAfter: number
): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.slack.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry at {retryString}',
      values: {
        retryString,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry,
    actionId,
    serviceMessage: message,
  };
}
