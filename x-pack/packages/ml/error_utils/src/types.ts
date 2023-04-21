/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Boom from '@hapi/boom';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export interface EsErrorRootCause {
  type: string;
  reason: string;
  caused_by?: EsErrorRootCause;
  script?: string;
}

export interface EsErrorBody {
  error: {
    root_cause?: EsErrorRootCause[];
    caused_by?: EsErrorRootCause;
    type: string;
    reason: string;
  };
  status: number;
}

export interface MLResponseError {
  statusCode: number;
  error: string;
  message: string;
  attributes?: {
    body: EsErrorBody;
  };
}

export interface ErrorMessage {
  message: string;
}

/**
 * To be used for client side errors related to search query bars.
 */
export interface QueryErrorMessage extends ErrorMessage {
  query: string;
}

export interface MLErrorObject {
  causedBy?: string;
  message: string;
  statusCode?: number;
  fullError?: EsErrorBody;
}

export interface MLHttpFetchErrorBase<T> extends IHttpFetchError<T> {
  body: T;
}

export type MLHttpFetchError = MLHttpFetchErrorBase<MLResponseError>;

export type ErrorType = MLHttpFetchError | EsErrorBody | Boom.Boom | string | undefined;

export function isEsErrorBody(error: unknown): error is EsErrorBody {
  return isPopulatedObject(error, ['error']) && isPopulatedObject(error.error, ['reason']);
}

export function isErrorString(error: unknown): error is string {
  return typeof error === 'string';
}

export function isErrorMessage(error: unknown): error is ErrorMessage {
  return isPopulatedObject(error, ['message']) && typeof error.message === 'string';
}

export function isMLResponseError(error: unknown): error is MLResponseError {
  return (
    isPopulatedObject(error, ['body']) &&
    isPopulatedObject(error.body, ['message']) &&
    'message' in error.body
  );
}

export function isBoomError(error: unknown): error is Boom.Boom {
  return isPopulatedObject(error, ['isBoom']) && error.isBoom === true;
}
