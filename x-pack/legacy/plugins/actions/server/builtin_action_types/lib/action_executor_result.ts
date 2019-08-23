/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable } from 'fp-ts/lib/Option';
import { i18n } from '@kbn/i18n';

import { ActionTypeExecutorResult } from '../../types';

export function successResult(data: any): ActionTypeExecutorResult {
  return { status: 'ok', data };
}

export function errorResult(
  id: string,
  message: string,
  actionDescription: string,
  actionErrorI18nIdentifier: string
): ActionTypeExecutorResult {
  const errMessage = i18n.translate(`xpack.actions.builtin.${actionErrorI18nIdentifier}`, {
    defaultMessage: 'an error occurred in action "{id}" {actionDescription}: {message}',
    values: {
      id,
      message,
      actionDescription,
    },
  });
  return {
    status: 'error',
    message: errMessage,
  };
}

export function retryResult(
  id: string,
  message: string,
  actionDescription: string,
  actionErrorI18nIdentifier: string
): ActionTypeExecutorResult {
  const errMessage = i18n.translate(`xpack.actions.builtin.${actionErrorI18nIdentifier}`, {
    defaultMessage: 'an error occurred in action "{id}" {actionDescription}, retry later',
    values: {
      id,
      actionDescription,
    },
  });
  return {
    status: 'error',
    message: errMessage,
    retry: true,
  };
}

export const DEFAULT_RETRY_AFTER: number = 60;
export function getRetryAfterIntervalFromHeaders(headers: Record<string, string>): number {
  return fromNullable(headers['retry-after'])
    .map(retryAfter => parseInt(retryAfter, 10))
    .filter(retryAfter => !isNaN(retryAfter))
    .getOrElse(DEFAULT_RETRY_AFTER);
}

export function retryResultSeconds(
  id: string,
  message: string,
  actionDescription: string,
  actionErrorI18nIdentifier: string,
  retryAfter: number
): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(`xpack.actions.builtin.${actionErrorI18nIdentifier}`, {
    defaultMessage:
      'an error occurred in action "{id}" {actionDescription}, retry at {retryString}: {message}',
    values: {
      id,
      retryString,
      message,
      actionDescription,
    },
  });
  return {
    status: 'error',
    message: errMessage,
    retry,
  };
}
