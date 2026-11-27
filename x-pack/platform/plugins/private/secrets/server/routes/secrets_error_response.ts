/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import {
  SecretAlreadyExistsError,
  SecretConflictError,
  SecretNotFoundError,
  SecretsUnavailableError,
  SecretUndecryptableError,
  SecretValidationError,
} from '@kbn/secrets';

/** Maps an error of the secrets client to its HTTP response, and rethrows any other error. */
export const toSecretsErrorResponse = ({
  response,
  error,
}: {
  response: KibanaResponseFactory;
  error: unknown;
}): IKibanaResponse => {
  if (error instanceof SecretValidationError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof SecretNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (
    error instanceof SecretAlreadyExistsError ||
    error instanceof SecretConflictError ||
    error instanceof SecretUndecryptableError
  ) {
    return response.conflict({ body: { message: error.message } });
  }
  if (error instanceof SecretsUnavailableError) {
    return response.customError({ statusCode: 503, body: { message: error.message } });
  }
  throw error;
};
