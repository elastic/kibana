/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { toSecretsErrorResponse } from '@kbn/secrets-plugin/server';

/**
 * Maps an error of a secrets route to its HTTP response: an HTTP error, such as a space that does
 * not exist, keeps its status, and an error of the secrets client gets the status the plugin gives it.
 */
export const toSecretsRouteErrorResponse = ({
  response,
  error,
}: {
  response: KibanaResponseFactory;
  error: unknown;
}): IKibanaResponse =>
  Boom.isBoom(error)
    ? response.customError({
        statusCode: error.output.statusCode,
        body: { message: error.output.payload.message },
      })
    : toSecretsErrorResponse({ response, error });
