/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import {
  AiIndexAlreadyExistsError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  InvalidAiIndexDestError,
  InvalidConnectorSourceError,
} from '../ai_indices/errors';

/**
 * Maps AI index registry errors onto HTTP responses. Shared by every route that touches the
 * registry — the AI index CRUD routes, and the improvements and feedback-loop routes, which resolve
 * an AI index before doing anything else. Anything unrecognised is rethrown so it surfaces as a 500.
 */
export const handleAiIndexError = (
  error: unknown,
  response: KibanaResponseFactory
): IKibanaResponse => {
  if (error instanceof InvalidAiIndexDestError || error instanceof InvalidConnectorSourceError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (
    error instanceof AiIndexManagedError ||
    error instanceof AiIndexConflictError ||
    error instanceof AiIndexAlreadyExistsError
  ) {
    return response.conflict({ body: { message: error.message } });
  }
  throw error;
};
