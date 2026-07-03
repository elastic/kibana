/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';

/**
 * User-facing message returned when an Elasticsearch response exceeds the size
 * that Kibana is able to process. It is intentionally actionable so the user
 * can narrow the query rather than being shown an opaque 500.
 */
export const RESPONSE_TOO_LARGE_MESSAGE =
  'The resulting dataset is too large to process. Try narrowing your search with filters or use a smaller time range.';

interface HandleMaximumResponseSizeExceededErrorArgs {
  error: unknown;
  response: KibanaResponseFactory;
  logger: Logger;
  /** Short description of the route, used to give the warn log some context. */
  context: string;
}

/**
 * Translates an Elasticsearch "maximum response size exceeded" abort into an
 * actionable `400` response. When the error is not a response-size error this
 * returns `undefined` so the caller can fall through to its generic handler.
 *
 * The size error is a user-data problem (their query matched too much data),
 * not a server fault, so it is logged at `warn` level.
 */
export const handleMaximumResponseSizeExceededError = ({
  error,
  response,
  logger,
  context,
}: HandleMaximumResponseSizeExceededErrorArgs): IKibanaResponse | undefined => {
  if (!isMaximumResponseSizeExceededError(error)) {
    return undefined;
  }

  logger.warn(`${context}: Elasticsearch response exceeded the maximum size Kibana can process`);

  return response.customError({
    statusCode: 400,
    body: { message: RESPONSE_TOO_LARGE_MESSAGE },
  });
};
