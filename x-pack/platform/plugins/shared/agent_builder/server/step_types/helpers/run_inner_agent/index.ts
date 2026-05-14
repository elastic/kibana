/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, toArray } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  AgentExecutionMode,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ConversationExecutionParams } from '@kbn/agent-builder-server/execution';

export const runInnerAgent = async ({
  abortSignal,
  executionService,
  params,
  request,
  schema,
  storeConversation,
}: {
  abortSignal: AbortSignal;
  executionService: AgentExecutionService;
  params: ConversationExecutionParams;
  request: KibanaRequest;
  schema: Record<string, unknown> | undefined;
  storeConversation: boolean;
}): Promise<{
  outputConversationId: string | undefined;
  outputMessage: string;
  round: ConversationRound;
}> => {
  const { events$ } = await executionService.executeAgent({
    abortSignal,
    mode: AgentExecutionMode.conversation,
    params,
    request,
    useTaskManager: false,
  });

  const events = await firstValueFrom(events$.pipe(toArray()));

  const roundEvent = events.find(isRoundCompleteEvent);
  if (!roundEvent) {
    throw new Error('No round_complete event received from execution service');
  }

  const round = roundEvent.data.round;

  const outputConversationId = ((): string | undefined => {
    if (!storeConversation) {
      return undefined;
    }
    const conversationEvent = events.find(
      (e) => isConversationCreatedEvent(e) || isConversationUpdatedEvent(e)
    );
    if (!conversationEvent) {
      throw new Error('No conversation_created / conversation_updated event received');
    }
    return conversationEvent.data.conversation_id;
  })();

  const outputMessage = schema
    ? JSON.stringify(round.response.structured_output)
    : round.response.message;

  return { outputConversationId, outputMessage, round };
};
