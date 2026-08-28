/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY,
  of,
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
  isMessageChunkEvent,
  isRoundCompleteEvent,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import { serializeExecutionError } from '../execution_runner';
import type { SurfaceProjectionServiceStart } from '../../surface_projection';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { getSurfaceProjector, projectRoundForSurface } from './project_round_for_surface';

/**
 * Delivers the execution's events to its configured callback URL, resolving once every
 * delivery has finished. Never rejects; a no-op when the execution has no callback.
 *
 * The terminal round_complete event is deferred until the stream completes, so it is only
 * delivered after the conversation has been persisted. If the stream errors first (e.g. the
 * persistence write failed), round_complete is skipped and a failure callback is sent instead.
 */
export const deliverCallbackEvents = ({
  execution,
  events$,
  callbackDeliveryService,
  surfaceProjection,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  callbackDeliveryService: CallbackDeliveryService;
  surfaceProjection?: SurfaceProjectionServiceStart;
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

  const transport = callbackDeliveryService.createTransport(callbackUrl);

  const projector = getSurfaceProjector({ execution, surfaceProjection });

  const deliverEvent = (event: ChatEvent) => {
    const isTerminal = isRoundCompleteEvent(event);
    // Projection applies to the terminal reply only; see the surface-projection spike for
    // why per-message projection needs the external host to post more than once per turn.
    const payloadEvent$ =
      isRoundCompleteEvent(event) && projector
        ? from(projectRoundForSurface({ event, projector, logger }))
        : of(event);

    const delivery = payloadEvent$.pipe(
      concatMap((deliveredEvent) =>
        callbackDeliveryService.makeCallbackRequest({
          payload: {
            execution_id: execution.executionId,
            event: deliveredEvent,
            ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
          },
          transport,
          retry: isTerminal,
        })
      )
    );

    return delivery.pipe(
      catchError((error) => {
        logger.warn(
          `Failed to deliver callback event for execution ${execution.executionId}: ${error.message}`
        );

        return EMPTY;
      })
    );
  };

  return new Promise<void>((resolve) => {
    let roundCompleteEvent: ChatEvent | undefined;

    events$
      .pipe(
        filter((event) => !isMessageChunkEvent(event)),
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
        concatWith(defer(() => (roundCompleteEvent ? deliverEvent(roundCompleteEvent) : EMPTY))),
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
