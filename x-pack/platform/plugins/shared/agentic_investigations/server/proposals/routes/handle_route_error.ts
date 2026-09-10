/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import {
  ProposalConflictError,
  ProposalExpiredError,
  ProposalInvalidActionInputError,
  ProposalNotFoundError,
} from '../services/errors';

/**
 * Maps service errors to the outcomes the queue UI distinguishes: gone for an
 * expired deadline, conflict for "someone decided first", bad request for an
 * action input the action could never accept.
 */
export const handleRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof ProposalNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof ProposalExpiredError) {
    return response.customError({ statusCode: 410, body: { message: error.message } });
  }
  if (error instanceof ProposalConflictError) {
    return response.conflict({ body: { message: error.message } });
  }
  if (error instanceof ProposalInvalidActionInputError) {
    return response.badRequest({ body: { message: error.message } });
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Investigation proposals route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};
