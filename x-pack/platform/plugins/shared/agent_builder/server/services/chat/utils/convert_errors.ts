/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { createInternalError, isOnechatError } from '@kbn/onechat-common';
import { getCurrentTraceId } from '../../../tracing';
import type { TrackingService } from '../../../telemetry';

export function convertErrors<T>({
  logger,
  trackingService,
  conversationId,
}: {
  logger: Logger;
  trackingService?: TrackingService;
  conversationId?: string;
}): OperatorFunction<T, T> {
  return ($source) => {
    return $source.pipe(
      catchError((err) => {
        logger.error(`Error executing agent: ${err.stack}`);

        if (trackingService) {
          try {
            trackingService.trackError(err, conversationId);
          } catch (e) {
            // continue
          }
        }

        return throwError(() => {
          const traceId = getCurrentTraceId();
          if (isOnechatError(err)) {
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
