/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type { TaskErrorSource } from '@kbn/task-manager-plugin/common';

export function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'error calling webhook, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

export function errorResultRequestFailed(
  actionId: string,
  serviceMessage: string,
  errorSource?: TaskErrorSource
): ConnectorTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.requestFailedErrorMessage', {
    defaultMessage: 'error calling webhook, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
    errorSource,
  };
}

export function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.unreachableErrorMessage', {
    defaultMessage: 'error calling webhook, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

export function errorResultUnexpectedNullResponse(
  actionId: string
): ConnectorTypeExecutorResult<void> {
  const message = i18n.translate(
    'xpack.stackConnectors.webhook.unexpectedNullResponseErrorMessage',
    {
      defaultMessage: 'unexpected null response from webhook',
    }
  );
  return {
    status: 'error',
    actionId,
    message,
  };
}

export function retryResult(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
    serviceMessage,
  };
}

export function retryResultSeconds(
  actionId: string,
  serviceMessage: string,

  retryAfter: number
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry at {retryString}',
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
    serviceMessage,
  };
}
