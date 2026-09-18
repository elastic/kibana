/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import {
  ImpactForbiddenError,
  ImpactInvalidRequestError,
  ImpactNotFoundError,
} from '../services/errors';

export const handleRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof ImpactNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof ImpactForbiddenError) {
    return response.forbidden({ body: { message: error.message } });
  }
  if (error instanceof ImpactInvalidRequestError) {
    return response.badRequest({ body: { message: error.message } });
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Investigation impact route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};
