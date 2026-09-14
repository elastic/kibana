/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';

/** Maps unexpected service errors to a 500 with a logged message. */
export const handleRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Investigations route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};
