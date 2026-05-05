/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Boom from '@hapi/boom';

import type { EsErrorBody, ErrorMessage, MLResponseError } from '@kbn/ml-common-types/errors';

/**
 * Type guard to check if error is of type EsErrorBody
 * @export
 * @param {any} error
 * @returns {error is EsErrorBody}
 */
export function isEsErrorBody(error: any): error is EsErrorBody {
  return error && error.error?.reason !== undefined;
}

/**
 * Type guard to check if error is a string.
 * @export
 * @param {any} error
 * @returns {error is string}
 */
export function isErrorString(error: any): error is string {
  return typeof error === 'string';
}

/**
 * Type guard to check if error is of type ErrorMessage.
 * @export
 * @param {any} error
 * @returns {error is ErrorMessage}
 */
export function isErrorMessage(error: any): error is ErrorMessage {
  return error && error.message !== undefined && typeof error.message === 'string';
}

/**
 * Type guard to check if error is of type MLResponseError.
 * @export
 * @param {any} error
 * @returns {error is MLResponseError}
 */
export function isMLResponseError(error: any): error is MLResponseError {
  return typeof error.body === 'object' && 'message' in error.body;
}

/**
 * Type guard to check if error is of type Boom.
 * @export
 * @param {any} error
 * @returns {error is Boom.Boom}
 */
export function isBoomError(error: any): error is Boom.Boom {
  return error?.isBoom === true;
}
