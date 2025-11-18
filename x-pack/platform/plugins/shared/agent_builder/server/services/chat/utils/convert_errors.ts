/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { createInternalError, isAgentBuilderError } from '@kbn/agent-builder-common';
import { getCurrentTraceId } from '../../../tracing';

export function convertErrors<T>({ logger }: { logger: Logger }): OperatorFunction<T, T> {
  return ($source) => {
    return $source.pipe(
      catchError((err) => {
        logger.error(`Error executing agent: ${err.stack}`);
        return throwError(() => {
          const traceId = getCurrentTraceId();
          if (isAgentBuilderError(err)) {
            err.meta = {
              ...err.meta,
              traceId,
            };
            return err;
          } else {
            return createInternalError(`Error executing agent: ${err.message}`, {
              statusCode: 500,
              traceId,
            });
          }
        });
      })
    );
  };
}
