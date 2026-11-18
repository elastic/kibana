/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import {
  AgentExecutionMode,
  isExecutionTerminatedEvent,
  isRoundCompleteEvent,
  type ChatEvent,
  type SurfacePayload,
} from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents/prompts';
import type {
  AgentExecution,
  ConversationAgentExecution,
} from '@kbn/agent-builder-server/execution';
import type { ConversationService } from '../../conversation';
import type { SurfacesService } from '../../surfaces';
import type { AgentExecutionClient } from '../persistence';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { readAttachments } from './deliver_callback_events';

/** How many of the conversation's latest executions are looked at to find the one that asked. */
const MAX_CANDIDATES = 10;

/** What a paused execution asked, and wrote before asking. */
interface PausedExecution {
  execution: ConversationAgentExecution;
  callbackUrl: string;
  message: string;
  prompts: PromptRequest[];
}

/** What the execution asked of the answered prompts, when it paused on any of them. */
const readPaused = async ({
  candidate,
  responses,
  executionClient,
}: {
  candidate: AgentExecution;
  responses: Record<string, PromptResponse>;
  executionClient: AgentExecutionClient;
}): Promise<Omit<PausedExecution, 'callbackUrl'> | undefined> => {
  if (candidate.executionMode !== AgentExecutionMode.conversation) {
    return undefined;
  }

  const { events } = await executionClient.readEvents(candidate.executionId);
  const outcome = events.find(isExecutionTerminatedEvent)?.data.outcome;
  const prompts =
    outcome?.type === 'prompt_requested'
      ? outcome.prompts.filter(({ id }) => responses[id] !== undefined)
      : [];

  return prompts.length > 0
    ? {
        execution: candidate,
        message: events.find(isRoundCompleteEvent)?.data.round.response.message ?? '',
        prompts,
      }
    : undefined;
};

/**
 * The execution that paused the conversation on the answered prompts, when it has a callback: the
 * latest of the conversation's executions that asked them. Executions in between, such as a resume
 * that failed before it started, are passed over.
 */
const findPausedExecution = async ({
  execution,
  conversationId,
  responses,
  executionClient,
}: {
  execution: ConversationAgentExecution;
  conversationId: string;
  responses: Record<string, PromptResponse>;
  executionClient: AgentExecutionClient;
}): Promise<PausedExecution | undefined> => {
  const candidates = await executionClient.find({
    spaceId: execution.spaceId,
    filter: { conversationId },
    size: MAX_CANDIDATES,
  });

  for (const candidate of candidates) {
    const paused =
      candidate.executionId === execution.executionId
        ? undefined
        : await readPaused({ candidate, responses, executionClient });

    if (paused) {
      const callbackUrl = paused.execution.agentParams.callback?.url;

      return callbackUrl ? { ...paused, callbackUrl } : undefined;
    }
  }

  return undefined;
};

/**
 * Tells the callback of the execution that paused a conversation that its prompts were answered,
 * so the surface that asked them stops offering them. Sent once the run that resumes the
 * conversation starts, whether the answer came from that surface or from Kibana, with the prompts
 * and their answers rendered for the surface.
 *
 * Subscribes to `events$` synchronously, so it can be attached before a cold stream is connected.
 * Never rejects.
 */
export const deliverPromptResolved = async ({
  execution,
  events$,
  request,
  executionClient,
  callbackDeliveryService,
  conversationService,
  surfacesService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  request: KibanaRequest;
  executionClient: AgentExecutionClient;
  callbackDeliveryService: CallbackDeliveryService;
  conversationService: ConversationService;
  surfacesService: SurfacesService;
  logger: Logger;
}): Promise<void> => {
  if (execution.executionMode !== AgentExecutionMode.conversation) {
    return;
  }

  const {
    conversationId,
    nextInput: { prompts: responses = {} },
  } = execution.agentParams;

  if (!conversationId || Object.keys(responses).length === 0) {
    return;
  }

  try {
    // The run only emits once it accepted the responses.
    await firstValueFrom(events$);
  } catch {
    return;
  }

  try {
    const paused = await findPausedExecution({
      execution,
      conversationId,
      responses,
      executionClient,
    });

    if (!paused) {
      return;
    }

    callbackDeliveryService.validateCallbackUrl(paused.callbackUrl);

    const surfacePayload: SurfacePayload | undefined = await surfacesService.renderPayload(
      {
        message: paused.message,
        attachments: await readAttachments({ execution, request, conversationService }),
        prompts: paused.prompts,
        promptResponses: responses,
      },
      {
        originType: paused.execution.agentParams.origin?.type,
        agentId: paused.execution.agentId,
        request,
        spaceId: paused.execution.spaceId,
      }
    );

    await callbackDeliveryService.makeCallbackRequest({
      payload: {
        execution_id: paused.execution.executionId,
        event: {
          type: 'prompt_resolved',
          data: { responses },
          ...(surfacePayload ? { surface_payload: surfacePayload } : {}),
        },
        idempotency_key: `${paused.execution.executionId}:prompt_resolved`,
      },
      callbackUrl: paused.callbackUrl,
      retry: true,
    });
  } catch (error) {
    logger.warn(
      `Failed to deliver the prompt resolved callback for execution ${execution.executionId}: ${error.message}`
    );
  }
};
