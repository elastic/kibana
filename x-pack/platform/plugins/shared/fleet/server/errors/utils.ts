/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { FleetError } from '../../common';

export function isESClientError(error: unknown): error is errors.ResponseError {
  return error instanceof errors.ResponseError;
}

export function isElasticsearchVersionConflictError(error: Error): boolean {
  return isESClientError(error) && error.meta.statusCode === 409;
}

export const wrapWithFleetErrorIfNeeded = (err: Error): FleetError => {
  if (err instanceof FleetError) {
    return err;
  }

  let message = err.message;

  if (isESClientError(err)) {
    message += ` (Status Code: [${err.statusCode}], body: [${JSON.stringify(err.body)}])`;
  }

  return new FleetError(message, err);
};

/**
 * Error handling utility for use with promises that will wrap any thrown error with a `FleetError`.
 * Especially useful when working with ES/SO client, as errors thrown by those client normally do
 * not include a very helpful stack trace.
 *
 * @param error
 *
 * @example
 *
 *    esClient.search(...).catch(catchAndWrapError);
 */
export const catchAndWrapError = (error: Error): Promise<never> => {
  return Promise.reject(wrapWithFleetErrorIfNeeded(error));
};
