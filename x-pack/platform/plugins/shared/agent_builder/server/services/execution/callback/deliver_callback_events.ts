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
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type {
  AgentExecution,
  ConversationAgentExecution,
} from '@kbn/agent-builder-server/execution';
import type { ConversationService } from '../../conversation';
import type { SurfaceResponse, SurfacesService } from '../../surfaces';
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

  const deliverEvent = (event?: ChatCallbackEvent) => {
    if (!event) {
      return EMPTY;
    }

    const isTerminal = isExecutionTerminatedEvent(event) || isRoundCompleteEvent(event);

    // Deferred so the request only starts once subscribed, after the previous delivery settled.
    return defer(() =>
      callbackDeliveryService.makeCallbackRequest({
        payload: {
          execution_id: execution.executionId,
          event,
          ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
        },
        callbackUrl,
        retry: isTerminal,
      })
    ).pipe(
      catchError((error) => {
        logger.warn(
          `Failed to deliver callback event for execution ${execution.executionId}: ${error.message}`
        );

        return EMPTY;
      })
    );
  };

  return new Promise<void>((resolve) => {
    let executionTerminatedEvent: ExecutionTerminatedEvent | undefined;
    let roundCompleteEvent: RoundCompleteEvent | undefined;

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
          if (isToolCallEvent(event)) {
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
                ? renderSurfacePayload({
                    event: executionTerminatedEvent,
                    roundCompleteEvent,
                    execution,
                    request,
                    conversationService,
                    surfacesService,
                    logger,
                  })
                : Promise.resolve(undefined)
            )
          ).pipe(
            concatMap((surfacePayload) =>
              concat(
                deliverEvent(
                  executionTerminatedEvent && {
                    ...executionTerminatedEvent,
                    surface_payload: surfacePayload,
                    tool_calls: [...toolCalls.values()],
                  }
                ),
                deliverEvent(
                  roundCompleteEvent && { ...roundCompleteEvent, surface_payload: surfacePayload }
                )
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

const readAttachments = async ({
  execution,
  request,
  conversationService,
}: {
  execution: ConversationAgentExecution;
  request: KibanaRequest;
  conversationService: ConversationService;
}): Promise<VersionedAttachment[]> => {
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

/** What the run wrote for its reader: its response, or the prompts it paused on after what it had written. */
const toSurfaceResponse = (
  outcome: ExecutionTerminatedEvent['data']['outcome'],
  roundCompleteEvent: RoundCompleteEvent | undefined
): Pick<SurfaceResponse, 'message' | 'prompts'> =>
  outcome.type === 'responded'
    ? { message: outcome.response.message }
    : {
        message: roundCompleteEvent?.data.round.response.message ?? '',
        prompts: outcome.prompts,
      };

const renderSurfacePayload = async ({
  event: {
    data: { outcome },
  },
  roundCompleteEvent,
  execution,
  request,
  conversationService,
  surfacesService,
  logger,
}: {
  event: ExecutionTerminatedEvent;
  roundCompleteEvent: RoundCompleteEvent | undefined;
  execution: ConversationAgentExecution;
  request: KibanaRequest;
  conversationService: ConversationService;
  surfacesService: SurfacesService;
  logger: Logger;
}): Promise<SurfacePayload | undefined> => {
  try {
    const attachments = await readAttachments({ execution, request, conversationService });

    return await surfacesService.renderPayload(
      { ...toSurfaceResponse(outcome, roundCompleteEvent), attachments },
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
