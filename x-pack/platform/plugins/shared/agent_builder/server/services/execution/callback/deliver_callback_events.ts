/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY,
  concat,
  from,
  concatMap,
  concatWith,
  defer,
  catchError,
  filter,
  type Observable,
} from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import {
  AgentExecutionMode,
  isExecutionAbortedEvent,
  isExecutionFailedEvent,
  isExecutionStartedEvent,
  isExecutionTerminatedEvent,
  isMessageChunkEvent,
  isRoundCompleteEvent,
  isToolCallStep,
  type ChatCallbackEvent,
  type ChatCallbackExecutionTerminatedEvent,
  type ChatCallbackToolCall,
  type ChatEvent,
  type Conversation,
  type ConversationRoundStep,
  type ExecutionTerminatedEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { SurfacesService } from '../../surfaces';
import { executionSteps } from '../run_agent/utils/context_timeline';
import { serializeExecutionError } from '../utils/serialize_execution_error';
import type { CallbackDeliveryService } from './callback_delivery_service';

/** The fields added to execution_terminated at callback delivery. */
type CallbackFields = Pick<ChatCallbackExecutionTerminatedEvent, 'surface_payload' | 'tool_calls'>;

/** The tool calls among the steps, summarized for a callback: no params or results. */
const toCallbackToolCalls = (steps: ConversationRoundStep[]): ChatCallbackToolCall[] =>
  steps
    .filter(isToolCallStep)
    .map(({ tool_call_id: toolCallId, tool_id: toolId, intent, interrupted }) => ({
      tool_call_id: toolCallId,
      tool_id: toolId,
      ...(intent ? { intent } : {}),
      ...(interrupted ? { interrupted } : {}),
    }));

/**
 * Delivers the execution's events to its configured callback URL, resolving once every
 * delivery has finished. Never rejects; a no-op when the execution has no callback.
 *
 * The terminal events, execution_terminated then round_complete, are deferred until the stream
 * completes, so they are only delivered after the conversation has been persisted. Both carry the
 * same idempotency key, so a consumer acts on whichever it handles first. If the stream errors
 * first (e.g. the persistence write failed), both are skipped and a failure callback is sent
 * instead.
 *
 * The stored conversation is then read back to build execution_terminated's callback fields: the
 * response message ready to post on the surface (also added to round_complete), and a summary of
 * the execution's tool calls. Neither is stored.
 */
export const deliverCallbackEvents = ({
  execution,
  events$,
  request,
  readConversation,
  callbackDeliveryService,
  surfacesService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  request: KibanaRequest;
  /** Reads the execution's stored conversation, or resolves to nothing when it is not stored. */
  readConversation: () => Promise<Conversation | undefined>;
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

  const deliverEvent = (event: ChatCallbackEvent) => {
    const isTerminal = isExecutionTerminatedEvent(event) || isRoundCompleteEvent(event);
    const delivery = callbackDeliveryService.makeCallbackRequest({
      payload: {
        execution_id: execution.executionId,
        event,
        ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
      },
      callbackUrl,
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

  /** execution_terminated's callback fields, built from the event and the stored conversation. */
  const buildCallbackFields = async ({
    execution_id: terminatedExecutionId,
    data: { outcome },
  }: ExecutionTerminatedEvent): Promise<CallbackFields> => {
    let conversation: Conversation | undefined;

    try {
      conversation = await readConversation();
    } catch (error) {
      logger.warn(
        `Failed to read the conversation of execution ${execution.executionId} for its callback: ${error.message}`
      );
    }

    if (!conversation) {
      return {};
    }

    const { events = [], attachments = [] } = conversation;
    const steps = executionSteps(
      events.filter((event) => event.execution_id === terminatedExecutionId)
    );

    // The response message ready to post on the execution's surface, such as Slack.
    const surfacePayload =
      outcome.type === 'responded'
        ? await surfacesService.renderPayload(
            { message: outcome.response.message, attachments },
            {
              originType: execution.agentParams.origin?.type,
              agentId: execution.agentId,
              request,
              spaceId: execution.spaceId,
            }
          )
        : undefined;

    return { surface_payload: surfacePayload, tool_calls: toCallbackToolCalls(steps) };
  };

  return new Promise<void>((resolve) => {
    let executionTerminatedEvent: ExecutionTerminatedEvent | undefined;
    let roundCompleteEvent: RoundCompleteEvent | undefined;

    events$
      .pipe(
        filter(
          (event) =>
            !isMessageChunkEvent(event) &&
            !isExecutionStartedEvent(event) &&
            // The failure callback is the only terminal representation of a failed or aborted run.
            !isExecutionFailedEvent(event) &&
            !isExecutionAbortedEvent(event)
        ),
        concatMap((event) => {
          // Hold the terminal events back until the stream completes (persistence succeeded).
          if (isExecutionTerminatedEvent(event)) {
            executionTerminatedEvent = event;

            return EMPTY;
          }

          if (isRoundCompleteEvent(event)) {
            roundCompleteEvent = event;

            return EMPTY;
          }

          return deliverEvent(event);
        }),
        // Deliver the buffered terminal events last, only on successful completion. On a stream
        // error concatWith propagates it to catchError below, skipping these deliveries.
        concatWith(
          defer(() =>
            from(
              executionTerminatedEvent
                ? buildCallbackFields(executionTerminatedEvent)
                : Promise.resolve<CallbackFields>({})
            )
          ).pipe(
            concatMap((callbackFields) =>
              concat(
                executionTerminatedEvent
                  ? deliverEvent({ ...executionTerminatedEvent, ...callbackFields })
                  : EMPTY,
                roundCompleteEvent
                  ? deliverEvent({
                      ...roundCompleteEvent,
                      surface_payload: callbackFields.surface_payload,
                    })
                  : EMPTY
              )
            )
          )
        ),
        catchError((error) => {
          const failureDelivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              error: serializeExecutionError(error),
              idempotency_key: execution.executionId,
            },
            callbackUrl,
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
