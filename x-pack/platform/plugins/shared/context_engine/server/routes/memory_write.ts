/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError, AiIndexWriteForbiddenError } from '../ai_indices/errors';
import {
  ContextEngineDisabledError,
  MemoryDisabledError,
  MemoryForbiddenError,
  RememberCapacityError,
  SessionMemoryNotFoundError,
} from '../session_memory_client/errors';

const REMEMBER_RETRY_AFTER_SECONDS = '1';

/**
 * Security for memory routes that write. `manageMemory` is declared so the API docs list it; the
 * session memory client enforces it, along with the other checks.
 */
export const MEMORY_WRITE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.writeContextEngine],
    extendedPrivileges: [apiPrivileges.manageMemory],
  },
};

/** Maps a session memory client error to its response, and rethrows any other error. */
export const toMemoryWriteErrorResponse = (
  error: unknown,
  response: KibanaResponseFactory
): IKibanaResponse => {
  if (error instanceof ContextEngineDisabledError) {
    return response.notFound({ body: { message: 'Not Found' } });
  }
  if (
    error instanceof MemoryDisabledError ||
    error instanceof AiIndexNotFoundError ||
    error instanceof SessionMemoryNotFoundError
  ) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof MemoryForbiddenError || error instanceof AiIndexWriteForbiddenError) {
    return response.forbidden({ body: { message: error.message } });
  }
  if (error instanceof RememberCapacityError) {
    return response.customError({
      statusCode: 429,
      body: { message: error.message },
      headers: { 'Retry-After': REMEMBER_RETRY_AFTER_SECONDS },
    });
  }
  throw error;
};
