/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isBadRequestError,
  isConversationAlreadyExistsError,
  isConversationNotFoundError,
  isConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import { ExecutionError } from '@kbn/workflows/server';

/**
 * Gives conversation client errors a specific `ExecutionError` type; anything unrecognized is
 * returned untouched so the engine's own conversion applies.
 *
 * Access denials surface as not-found, deliberately, so a caller cannot distinguish a
 * conversation that does not exist from one it may not see. Both stay indistinguishable here.
 */
export const toConversationStepError = (error: unknown): unknown => {
  if (
    isConversationNotFoundError(error) ||
    isBadRequestError(error) ||
    isConversationAlreadyExistsError(error)
  ) {
    return new ExecutionError({ type: 'ValidationError', message: error.message });
  }

  if (isConversationWriteConflictError(error)) {
    return new ExecutionError({ type: 'ConflictError', message: error.message });
  }

  return error;
};
