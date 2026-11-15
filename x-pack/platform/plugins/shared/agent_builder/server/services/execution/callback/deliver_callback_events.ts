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
  tap,
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
  isToolCallEvent,
  type ChatCallbackEvent,
  type ChatCallbackToolCall,
  type ChatEvent,
  type ExecutionTerminatedEvent,
  type RoundCompleteEvent,
  type SurfacePayload,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ConversationService } from '../../conversation';
import type { SurfacesService } from '../../surfaces';
import { serializeExecutionError } from '../utils/serialize_execution_error';
import type { CallbackDeliveryService } from './callback_delivery_service';

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
 * execution_terminated also carries two fields that are never stored: the response message ready
 * to post on the surface (also added to round_complete), rendered with the attachments of the
 * stored conversation, and a summary of the tool calls seen on the stream.
 */
export const deliverCallbackEvents = ({
  execution,
  events$,
  request,
  callbackDeliveryService,
  conversationService,
  surfacesService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  request: KibanaRequest;
  callbackDeliveryService: CallbackDeliveryService;
  conversationService: ConversationService;
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

  /** The stored conversation's attachments, as the execution's owner; empty when not stored. */
  const readAttachments = async () => {
    const { owner, runAs } = execution;
    const { conversationId, storeConversation } = execution.agentParams;

    if (!owner || !conversationId || storeConversation === false) {
      return [];
    }

    const conversationClient = await conversationService.getScopedClientAsUser({
      request,
      user: { ...owner, isAdmin: false },
      ...(runAs ? { runAs: runAs.serviceAccountId } : {}),
    });
    const { attachments = [] } = await conversationClient.get(conversationId);

    return attachments;
  };

  /** The response message ready to post on the execution's surface, such as Slack. */
  const renderSurfacePayload = async ({
    data: { outcome },
  }: ExecutionTerminatedEvent): Promise<SurfacePayload | undefined> => {
    if (outcome.type !== 'responded') {
      return undefined;
    }

    try {
      const attachments = await readAttachments();

      return await surfacesService.renderPayload(
        { message: outcome.response.message, attachments },
        {
          originType: execution.agentParams.origin?.type,
          agentId: execution.agentId,
          request,
          spaceId: execution.spaceId,
        }
      );
    } catch (error) {
      logger.warn(
        `Failed to read the attachments of execution ${execution.executionId} for its callback: ${error.message}`
      );

      return undefined;
    }
  };

  return new Promise<void>((resolve) => {
    let executionTerminatedEvent: ExecutionTerminatedEvent | undefined;
    let roundCompleteEvent: RoundCompleteEvent | undefined;
    // The execution's tool calls, by id, summarized for execution_terminated: no params or results.
    const toolCalls = new Map<string, ChatCallbackToolCall>();

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
        tap((event) => {
          if (isToolCallEvent(event) && !toolCalls.has(event.data.tool_call_id)) {
            const { tool_call_id: toolCallId, tool_id: toolId, intent } = event.data;

            toolCalls.set(toolCallId, {
              tool_call_id: toolCallId,
              tool_id: toolId,
              ...(intent ? { intent } : {}),
            });
          }
        }),
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
                ? renderSurfacePayload(executionTerminatedEvent)
                : Promise.resolve(undefined)
            )
          ).pipe(
            concatMap((surfacePayload) =>
              concat(
                executionTerminatedEvent
                  ? deliverEvent({
                      ...executionTerminatedEvent,
                      surface_payload: surfacePayload,
                      tool_calls: [...toolCalls.values()],
                    })
                  : EMPTY,
                roundCompleteEvent
                  ? deliverEvent({ ...roundCompleteEvent, surface_payload: surfacePayload })
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
