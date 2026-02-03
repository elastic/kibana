/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonoTypeOperatorFunction } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { isSSEError } from '@kbn/sse-utils';
import type { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { createAgentBuilderError } from '@kbn/agent-builder-common';

/**
 * Convert SSE errors to AgentBuilder errors and rethrow them.
 */
export function unwrapAgentBuilderErrors<T>(): MonoTypeOperatorFunction<T> {
  return catchError((err) => {
    if (isSSEError(err)) {
      return throwError(() =>
        createAgentBuilderError(err.code as AgentBuilderErrorCode, err.message, err.meta)
      );
    }
    return throwError(() => err);
  });
}
