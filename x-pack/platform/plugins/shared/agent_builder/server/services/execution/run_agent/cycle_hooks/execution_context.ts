/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type {
  AgentHandlerContext,
  CycleHookExecutionContext,
  CycleHookRound,
} from '@kbn/agent-builder-server';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { historyView } from '../utils/context_coverage';
import { isTimelineRound, roundResponse } from '../utils/context_timeline';
import type { ProcessedConversation } from '../utils/prepare_conversation';

/** The read-only view of an execution handed to `getHandler` of every cycle hook. */
export const buildCycleHookExecutionContext = ({
  context,
  agentId,
  agentConfiguration,
  skills,
  roundId,
  executionId,
  resumed,
  conversationId,
  processedConversation,
  abortSignal,
}: {
  context: AgentHandlerContext;
  agentId: string;
  agentConfiguration: AgentConfiguration;
  skills: InternalSkillDefinition[];
  roundId: string;
  executionId: string;
  resumed: boolean;
  conversationId?: string;
  processedConversation: ProcessedConversation;
  abortSignal?: AbortSignal;
}): CycleHookExecutionContext => ({
  request: context.request,
  abortSignal: abortSignal ?? new AbortController().signal,
  spaceId: context.spaceId,
  agent: { id: agentId, configuration: agentConfiguration, skills },
  execution: { id: executionId, roundId, resumed, parentId: context.parentExecutionId },
  input: processedConversation.nextInput,
  conversation: { id: conversationId, rounds: previousRounds(processedConversation) },
  services: {
    logger: context.logger,
    modelProvider: context.modelProvider,
    esClient: context.esClient,
    savedObjectsClient: context.savedObjectsClient,
  },
});

/** The rounds before this execution; a paused round being resumed is the current one, not history. */
const previousRounds = (conversation: ProcessedConversation): CycleHookRound[] =>
  historyView(conversation)
    .entries.filter(isTimelineRound)
    .map((round) => ({
      id: round.id,
      input: round.userMessage.data,
      response: roundResponse(round),
      steps: round.steps,
    }));
