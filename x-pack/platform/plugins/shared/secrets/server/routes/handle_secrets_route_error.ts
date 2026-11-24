/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import {
  SecretAlreadyExistsError,
  SecretNotFoundError,
  SecretsUnavailableError,
  SecretValidationError,
} from '@kbn/secrets';

/** Maps a secrets error to its HTTP response. Rethrows any other error. */
export const handleSecretsRouteError = ({
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
  if (error instanceof SecretAlreadyExistsError) {
    return response.conflict({ body: { message: error.message } });
  }
  if (error instanceof SecretsUnavailableError) {
    return response.customError({ statusCode: 503, body: { message: error.message } });
  }
  throw error;
};
