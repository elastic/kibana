/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY,
  from,
  concatMap,
  concatWith,
  defer,
  catchError,
  filter,
  type Observable,
} from 'rxjs';
import type { Logger } from '@kbn/logging';
import {
  AgentExecutionMode,
  isExecutionStartedEvent,
  isExecutionTerminalEvent,
  isMessageChunkEvent,
  isRoundCompleteEvent,
  type ChatEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { SurfacesService } from '../../surfaces';
import { serializeExecutionError } from '../utils/serialize_execution_error';
import type { CallbackDeliveryService } from './callback_delivery_service';

/**
 * Delivers the execution's events to its configured callback URL, resolving once every
 * delivery has finished. Never rejects; a no-op when the execution has no callback.
 *
 * The terminal round_complete event is deferred until the stream completes, so it is only
 * delivered after the conversation has been persisted. If the stream errors first (e.g. the
 * persistence write failed), round_complete is skipped and a failure callback is sent instead.
 * round_complete carries the response message ready to post on the round's surface, which is
 * never stored.
 */
export const deliverCallbackEvents = ({
  execution,
  events$,
  callbackDeliveryService,
  surfacesService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  callbackDeliveryService: CallbackDeliveryService;
  surfacesService: SurfacesService;
  logger: Logger;
}): Promise<void> => {
  // Only conversation executions have callbacks.
  if (execution.executionMode !== AgentExecutionMode.conversation) {
    return Promise.resolve();
  }

  const callbackUrl = execution.agentParams.callback?.url;

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

  const transport = callbackDeliveryService.createTransport(callbackUrl);

  const deliverEvent = (event: ChatEvent) => {
    const isTerminal = isRoundCompleteEvent(event);
    const delivery = callbackDeliveryService.makeCallbackRequest({
      payload: {
        execution_id: execution.executionId,
        event,
        ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
      },
      transport,
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
  };

  return new Promise<void>((resolve) => {
    let roundCompleteEvent: RoundCompleteEvent | undefined;

    events$
      .pipe(
        filter(
          (event) =>
            !isMessageChunkEvent(event) &&
            !isExecutionStartedEvent(event) &&
            // Terminal timeline events (terminated / failed / aborted) are never delivered as
            // events: the completion payload and the failure callback are the terminal
            // representations a callback consumer gets.
            !isExecutionTerminalEvent(event)
        ),
        concatMap((event) => {
          // Hold the terminal event back until the stream completes (persistence succeeded).
          if (isRoundCompleteEvent(event)) {
            roundCompleteEvent = event;

            return EMPTY;
          }

          return deliverEvent(event);
        }),
        // Deliver the buffered round_complete last, only on successful completion. On a stream
        // error concatWith propagates it to catchError below, skipping this delivery.
        concatWith(
          defer(() => {
            if (!roundCompleteEvent) {
              return EMPTY;
            }

            // The response message ready to post on the round's surface, such as Slack.
            const surfacePayload = surfacesService.renderPayload(roundCompleteEvent, {
              originType: execution.agentParams.origin?.type,
            });

            const event = { ...roundCompleteEvent, surface_payload: surfacePayload };

            return deliverEvent(event);
          })
        ),
        catchError((error) => {
          const failureDelivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              error: serializeExecutionError(error),
              idempotency_key: execution.executionId,
            },
            transport,
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
