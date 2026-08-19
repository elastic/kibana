/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

export type CcrApiError = Error | IHttpFetchError<ResponseErrorBody>;

export const toCcrApiError = (error: unknown): CcrApiError => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

export const isHttpFetchError = (
  error: CcrApiError
): error is IHttpFetchError<ResponseErrorBody> => {
  return 'request' in error;
};

export const getErrorStatus = (error: CcrApiError | null | undefined): number | undefined => {
  if (!error) {
    return;
  }

  if (!isHttpFetchError(error)) {
    return;
  }

  return error.response?.status ?? error.body?.statusCode;
};

export const getErrorBody = (
  error: CcrApiError | null | undefined
): ResponseErrorBody | undefined => {
  if (!error) {
    return;
  }

  return isHttpFetchError(error) ? error.body : undefined;
};
