/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { InvalidRequestError } from './errors';

interface EsErrorBody {
  error?: { reason?: string; root_cause?: Array<{ reason?: string }> };
}

function getEsErrorReason(error: errors.ResponseError): string {
  const body = error.body as EsErrorBody | undefined;
  return body?.error?.root_cause?.[0]?.reason ?? body?.error?.reason ?? error.message;
}

/** Maps Elasticsearch and validation errors to HTTP responses; anything else becomes a 500. */
export function handleError(
  error: Error,
  response: KibanaResponseFactory,
  logger: Logger
): IKibanaResponse {
  if (error instanceof InvalidRequestError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof errors.ResponseError) {
    return response.customError({
      statusCode: error.statusCode ?? 500,
      body: { message: getEsErrorReason(error) },
    });
  }
  logger.error(error);
  return response.customError({ statusCode: 500, body: { message: error.message } });
}
