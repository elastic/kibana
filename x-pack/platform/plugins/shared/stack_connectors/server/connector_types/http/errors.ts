/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { i18n } from '@kbn/i18n';
import { safeJsonStringify } from '@kbn/std';
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

/** Bound error detail length for logs and user-visible service messages */
const MAX_HTTP_ERROR_DETAIL_LENGTH = 2048;

const AXIOS_GENERIC_STATUS_MESSAGE = /^Request failed with status code \d+$/;

function truncateErrorDetail(text: string): string {
  if (text.length <= MAX_HTTP_ERROR_DETAIL_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_HTTP_ERROR_DETAIL_LENGTH)}…`;
}

function stripHtmlToPlainText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}

function getContentTypeFromHeaders(
  headers: AxiosResponse['headers'] | undefined
): string | undefined {
  if (!headers) {
    return undefined;
  }
  let raw: string | undefined;
  if (typeof (headers as AxiosHeaders).get === 'function') {
    const v = (headers as AxiosHeaders).get('content-type');
    raw = v != null ? String(v) : undefined;
  }
  if (!raw && typeof headers === 'object') {
    const record = headers as Record<string, string | undefined>;
    raw = record['content-type'] ?? record['Content-Type'];
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }
  return raw.split(';')[0]!.trim().toLowerCase();
}

function isAxiosGenericStatusFailureMessage(message: string): boolean {
  return AXIOS_GENERIC_STATUS_MESSAGE.test(message.trim());
}

function fallbackMessageWhenNoResponseBody(error: AxiosError<unknown>): string | undefined {
  const { message, code } = error;
  if (message == null) {
    return typeof code === 'string' ? code : undefined;
  }
  if (typeof message !== 'string') {
    return typeof code === 'string' ? code : undefined;
  }
  if (isAxiosGenericStatusFailureMessage(message)) {
    if (typeof code === 'string' && code !== 'ERR_BAD_REQUEST') {
      return code;
    }
    return undefined;
  }
  return truncateErrorDetail(message);
}

function extractFromErrorArray(items: unknown[]): string | undefined {
  const parts = items.slice(0, 15).map((item) => {
    if (typeof item === 'string') {
      return item.trim();
    }
    if (item && typeof item === 'object' && 'message' in item) {
      const m = (item as { message?: unknown }).message;
      return typeof m === 'string' ? m.trim() : '';
    }
    return '';
  });
  const joined = parts.filter(Boolean).join('; ');
  return joined || undefined;
}

function extractHumanReadableFromObject(obj: Record<string, unknown>): string | undefined {
  const pick = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;

  // RFC 7807 Problem Details
  const detail = pick(obj.detail);
  if (detail) {
    return detail;
  }
  const title = pick(obj.title);
  if (title) {
    return title;
  }

  // OAuth 2 / OIDC
  const errorDescription = pick(obj.error_description);
  if (errorDescription) {
    return errorDescription;
  }
  const oauthError = obj.error;
  if (typeof oauthError === 'string' && oauthError.trim()) {
    return oauthError.trim();
  }

  // Common top-level fields
  const message = pick(obj.message);
  if (message) {
    return message;
  }
  const reason = pick(obj.reason);
  if (reason) {
    return reason;
  }
  const description = pick(obj.description);
  if (description) {
    return description;
  }

  // AWS / some APIs
  const awsMessage = pick(obj.Message);
  if (awsMessage) {
    return awsMessage;
  }

  // Nested error object (e.g. Elasticsearch-style, wrapped errors)
  if (obj.error != null && typeof obj.error === 'object' && !Array.isArray(obj.error)) {
    const nested = obj.error as Record<string, unknown>;
    const nestedMsg =
      pick(nested.message) ?? pick(nested.reason) ?? pick(nested.msg) ?? pick(nested.detail);
    if (nestedMsg) {
      return nestedMsg;
    }
  }

  // Validation-style error lists
  if (Array.isArray(obj.errors)) {
    const fromErrors = extractFromErrorArray(obj.errors);
    if (fromErrors) {
      return fromErrors;
    }
  }

  return undefined;
}

function stringifyDataFallback(data: unknown): string | undefined {
  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }
  const serialized = safeJsonStringify(data);
  return serialized ? truncateErrorDetail(serialized) : undefined;
}

export function getErrorResponseMessage(error: AxiosError<unknown>): string | undefined {
  if (error == null || typeof error !== 'object') {
    return undefined;
  }
  const response = error.response;
  const data = response?.data;
  const contentType = getContentTypeFromHeaders(response?.headers);

  if (data == null || data === '') {
    return fallbackMessageWhenNoResponseBody(error);
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) {
      return fallbackMessageWhenNoResponseBody(error);
    }
    if (contentType?.includes('html')) {
      const plain = stripHtmlToPlainText(trimmed);
      return truncateErrorDetail(plain || trimmed);
    }
    return truncateErrorDetail(trimmed);
  }

  if (Array.isArray(data)) {
    const fromItems = extractFromErrorArray(data);
    if (fromItems) {
      return truncateErrorDetail(fromItems);
    }
    return stringifyDataFallback(data);
  }

  if (typeof data === 'object') {
    const extracted = extractHumanReadableFromObject(data as Record<string, unknown>);
    if (extracted) {
      return truncateErrorDetail(extracted);
    }
    return stringifyDataFallback(data);
  }

  return stringifyDataFallback(data) ?? fallbackMessageWhenNoResponseBody(error);
}
