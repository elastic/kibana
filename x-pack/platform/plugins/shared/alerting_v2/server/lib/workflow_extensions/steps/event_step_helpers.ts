/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { KibanaRequest } from '@kbn/core/server';

/**
 * Gets the request the step runs as and checks that it may write alert events.
 * Shared by the Create Alert and Create Signal steps, which need the same privilege.
 */
export async function getAuthorizedWriteRequest(
  context: { contextManager: { getFakeRequest: () => KibanaRequest } },
  checkAlertWritePrivilege: (request: KibanaRequest) => Promise<boolean>,
  permissionErrorMessage: string
): Promise<KibanaRequest> {
  const request = context.contextManager.getFakeRequest();

  const canWrite = await checkAlertWritePrivilege(request);
  if (!canWrite) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: permissionErrorMessage,
    });
  }

  return request;
}

/**
 * Turns an error from a step handler into the error the workflow engine expects.
 * An `ExecutionError` and an error caused by an aborted run are rethrown as they are.
 * A schema error becomes a `ValidationError`, and anything else becomes an `ApiError`.
 */
export function throwStepExecutionError(
  error: unknown,
  { abortSignal, fallbackMessage }: { abortSignal: AbortSignal; fallbackMessage: string }
): never {
  if (error instanceof ExecutionError) throw error;
  if (abortSignal.aborted) throw error;
  if (error instanceof Error && error.name === 'ZodError') {
    throw new ExecutionError({
      type: 'ValidationError',
      message: error.message,
      details: { name: error.name, message: error.message },
    });
  }
  throw new ExecutionError({
    type: 'ApiError',
    message: error instanceof Error ? error.message : fallbackMessage,
    details: error instanceof Error ? { name: error.name, message: error.message } : {},
  });
}
