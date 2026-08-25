/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatAgentEvent, ConversationRound } from '@kbn/agent-builder-common';
import type { PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ResearchAgentAction } from '../actions';
import type { ProcessedConversationRound } from './prepare_conversation';
import { roundToActions } from './round_to_actions';
import { pendingAskUserQuestionStepsToActions } from './pending_ask_user_question_steps_to_actions';
import { pendingBrowserToolResultPromptsToActions } from './pending_browser_tool_result_prompts_to_actions';

/**
 * Build the action list from the current pending round, for execution resuming (after HITL interrupts).
 *
 * `roundToActions` walks the round in step order (tool-call groups and already-answered
 * clarifying waves). `pendingAskUserQuestionStepsToActions` then appends the prompt
 * currently being answered — the only step still missing from the round itself.
 */
export const buildPendingRoundActions = async ({
  round,
  promptState,
  toolIdMapping,
  eventEmitter,
  attachments,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  toolIdMapping: ToolIdMapping;
  eventEmitter: (event: ChatAgentEvent) => void;
  attachments?: AttachmentStateManager;
}): Promise<{ actions: ResearchAgentAction[]; consumedPromptIds: string[] }> => {
  const stepActions = roundToActions({ round, toolIdMapping });
  const { actions: askActions, consumedPromptIds: askConsumed } =
    pendingAskUserQuestionStepsToActions({
      round,
      promptState,
      eventEmitter,
    });
  const { actions: browserActions, consumedPromptIds: browserConsumed } =
    await pendingBrowserToolResultPromptsToActions({
      round,
      promptState,
      attachments,
      eventEmitter,
    });
  return {
    actions: [...stepActions, ...askActions, ...browserActions],
    consumedPromptIds: [...askConsumed, ...browserConsumed],
  };
};
