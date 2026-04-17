/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import type { Error as EsUiError } from '@kbn/es-ui-shared-plugin/public';
import type { HttpError } from './types';

const isEsUiError = (value: unknown): value is EsUiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  );
};

const toMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }
  return String(value);
};

export const toHttpError = (error: unknown): HttpError => {
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    const body = isEsUiError(error.body)
      ? error.body
      : {
          error: 'Error',
          message: toMessage(error),
          statusCode: status,
        };
    return { status, body };
  }

  if (typeof error === 'object' && error !== null && 'body' in error && isEsUiError(error.body)) {
    const status =
      'status' in error && typeof error.status === 'number' ? error.status : error.body.statusCode;
    return { status, body: error.body };
  }

  return {
    body: {
      error: 'Error',
      message: toMessage(error),
    },
  };
};

export const getHttpErrorToastMessage = (error: unknown): string => {
  const httpError = toHttpError(error);
  return httpError.body?.message ?? httpError.body?.error ?? '';
};
