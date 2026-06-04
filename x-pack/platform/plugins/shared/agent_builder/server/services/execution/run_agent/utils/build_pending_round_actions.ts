/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatAgentEvent, ConversationRound } from '@kbn/agent-builder-common';
import type { PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { ResearchAgentAction } from '../actions';
import type { ProcessedConversationRound } from './prepare_conversation';
import { roundToActions } from './round_to_actions';
import { pendingAskUserQuestionStepsToActions } from './pending_ask_user_question_steps_to_actions';

/**
 * Single entry point for "paused round → actions to seed the resume run".
 * Combines step-derived actions (from `roundToActions`) and pending-ask_user_question
 * actions (from `pendingAskUserQuestionStepsToActions`). The latter also emits a
 * dedicated SSE event per resolved step so the UI sees the answer in real time.
 */
export const buildPendingRoundActions = ({
  round,
  promptState,
  toolIdMapping,
  eventEmitter,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  toolIdMapping: ToolIdMapping;
  eventEmitter: (event: ChatAgentEvent) => void;
}): { actions: ResearchAgentAction[]; consumedPromptIds: string[] } => {
  const stepActions = roundToActions({ round, toolIdMapping });
  const { actions: askActions, consumedPromptIds } = pendingAskUserQuestionStepsToActions({
    round,
    promptState,
    eventEmitter,
  });
  return {
    actions: [...stepActions, ...askActions],
    consumedPromptIds,
  };
};
