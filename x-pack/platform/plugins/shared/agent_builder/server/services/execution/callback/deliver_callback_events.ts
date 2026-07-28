/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, from, concatMap, catchError, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { isRoundCompleteEvent, type ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import { serializeExecutionError } from '../execution_runner';
import type { CallbackDeliveryService } from './callback_delivery_service';

/**
 * Delivers the execution's events to its configured callback URL, resolving once every
 * delivery has finished. Never rejects; a no-op when the execution has no callback.
 */
export const deliverCallbackEvents = ({
  execution,
  events$,
  callbackDeliveryService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  callbackDeliveryService: CallbackDeliveryService;
  logger: Logger;
}): Promise<void> => {
  const callbackUrl = callbackDeliveryService.getCallbackUrl(execution);

  if (!callbackUrl) {
    return Promise.resolve();
  }

  try {
    callbackDeliveryService.validateCallbackUrl(callbackUrl);
  } catch (error) {
    logger.error(
      `Skipping callback delivery for execution ${execution.executionId}: ${error.message}`
    );

    return Promise.resolve();
  }

  const makeRequest = callbackDeliveryService.createMakeRequest(callbackUrl);

  return new Promise<void>((resolve) => {
    events$
      .pipe(
        concatMap((event) => {
          const isTerminal = isRoundCompleteEvent(event);
          const delivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              event,
              ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
            },
            makeRequest,
            retry: isTerminal,
          });

          return from(delivery).pipe(
            catchError((error) => {
              logger.warn(
                `Failed to deliver callback event for execution ${execution.executionId}: ${error.message}`
              );

              return EMPTY;
            })
          );
        }),
        catchError((error) => {
          const failureDelivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              error: serializeExecutionError(error),
              idempotency_key: execution.executionId,
            },
            makeRequest,
            retry: true,
          });

          return from(failureDelivery).pipe(
            catchError((deliveryError) => {
              logger.warn(
                `Failed to deliver failure callback for execution ${execution.executionId}: ${deliveryError.message}`
              );
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        complete: () => resolve(),
        error: () => resolve(),
      });
  });
};
