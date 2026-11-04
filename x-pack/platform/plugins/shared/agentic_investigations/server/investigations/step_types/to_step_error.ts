/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import { WrongTemplateError } from '../../assignments/errors';

export const toStepError = (error: unknown, fallbackMessage: string): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }
  if (error instanceof WrongTemplateError) {
    return new ExecutionError({ type: 'ValidationError', message: error.message });
  }
  if (isConversationNotFoundError(error)) {
    return new ExecutionError({ type: 'NotFoundError', message: (error as Error).message });
  }
  return new ExecutionError({
    type: 'ApiError',
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};
