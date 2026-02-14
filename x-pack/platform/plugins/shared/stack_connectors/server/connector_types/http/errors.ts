/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import type { HttpConnectorTypeExecutorResult } from './types';

export function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): HttpConnectorTypeExecutorResult {
  const errMessage = i18n.translate('xpack.stackConnectors.http.invalidResponseErrorMessage', {
    defaultMessage: 'error calling http, invalid response',
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
): HttpConnectorTypeExecutorResult {
  const errMessage = i18n.translate('xpack.stackConnectors.http.requestFailedErrorMessage', {
    defaultMessage: 'error calling http, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
    errorSource,
  };
}

export function errorResultUnexpectedError(actionId: string): HttpConnectorTypeExecutorResult {
  const errMessage = i18n.translate('xpack.stackConnectors.http.unreachableErrorMessage', {
    defaultMessage: 'error calling http, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

export function errorResultUnexpectedNullResponse(
  actionId: string
): HttpConnectorTypeExecutorResult {
  const message = i18n.translate('xpack.stackConnectors.http.unexpectedNullResponseErrorMessage', {
    defaultMessage: 'unexpected null response from http',
  });
  return {
    status: 'error',
    actionId,
    message,
  };
}

export function retryResult(
  actionId: string,
  serviceMessage: string
): HttpConnectorTypeExecutorResult {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.http.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling http, retry later',
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
): HttpConnectorTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.http.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling http, retry at {retryString}',
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
