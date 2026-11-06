/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
interface HandleMaximumResponseSizeExceededErrorArgs {
  error: unknown;
  response: KibanaResponseFactory;
  logger: Logger;
  context: string;
}

export const handleMaximumResponseSizeExceededError = ({
  error,
  response,
  logger,
  context,
}: HandleMaximumResponseSizeExceededErrorArgs): IKibanaResponse | undefined => {
  if (!isMaximumResponseSizeExceededError(error)) {
    return undefined;
  }

  logger.warn(`${context}: Elasticsearch response exceeded the maximum size Kibana can process`, {
    error,
  });

  return response.badRequest({
    body: { message: `The response is too large to process. error: ${error.message}` },
  });
};
