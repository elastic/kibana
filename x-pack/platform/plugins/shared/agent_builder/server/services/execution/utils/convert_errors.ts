/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  AgentBuilderError,
  AgentBuilderErrorCode,
  ConversationOriginType,
} from '@kbn/agent-builder-common';
import { createInternalError, isAgentBuilderError } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/inference-common';
import { getCurrentTraceId } from '../../../tracing';
import type { AnalyticsService, TrackingService } from '../../../telemetry';
import { getHttpStatusFromError } from './serialize_execution_error';

/**
 * Converts any error into the {@link AgentBuilderError} the client receives, stamping the current
 * trace id on it. An `AgentBuilderError` is returned as the same instance (so its identity is kept
 * for downstream `isRequestAbortedError`-style checks); anything else is wrapped as an internal
 * error. Idempotent. Shared by {@link convertErrors} (the stream) and the interruption persister
 * so the stored error is exactly the one the client saw.
 *
 * `preserveHttpStatus` keeps a validated 4xx/5xx carried by the wrapped error as the client's
 * status. It is meant for the setup window, where a Boom-style error (auth, not found) used to
 * escape to the route unchanged; a dependency failing mid-run stays a 500, since a 404 from the
 * model's endpoint must not read as a 404 of the converse call itself.
 */
export const toClientError = (
  err: unknown,
  { preserveHttpStatus = false }: { preserveHttpStatus?: boolean } = {}
): AgentBuilderError<AgentBuilderErrorCode> => {
  const traceId = getCurrentTraceId();
  if (isAgentBuilderError(err)) {
    err.meta = {
      ...err.meta,
      traceId,
    };
    return err;
  }
  const message = err instanceof Error ? err.message : String(err);
  const statusCode = (preserveHttpStatus ? getHttpStatusFromError(err) : undefined) ?? 500;
  return createInternalError(
    `Error executing agent: ${message}`,
    { statusCode, traceId },
    { cause: err }
  );
};

export function convertErrors<T>({
  agentId,
  analyticsService,
  conversationId,
  executionId,
  logger,
  modelProvider,
  roundOrigin,
  trackingService,
}: {
  agentId: string;
  analyticsService?: AnalyticsService;
  conversationId?: string;
  executionId?: string;
  logger: Logger;
  modelProvider: ModelProvider;
  roundOrigin?: ConversationOriginType;
  trackingService?: TrackingService;
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

        analyticsService?.reportRoundError({
          agentId,
          conversationId,
          executionId,
          error: err,
          modelProvider,
          roundOrigin,
        });

        return throwError(() => toClientError(err));
      })
    );
  };
}
