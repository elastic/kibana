/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AIMessageChunk, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import type { ReasoningStep, ToolCallProgress, ToolCallStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType, createAskUserQuestionStep } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import {
  isAskUserQuestionPrompt,
  type PromptRequest,
} from '@kbn/agent-builder-common/agents/prompts';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import {
  extractTextContent,
  extractToolCallsWithReasoning,
  toolIdentifierFromToolCall,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
import { BROWSER_TOOL_PREFIX, TOOLS_WITH_DEDICATED_STEP_LIFECYCLE } from './constants';
import { stepUpdates, type RunStepUpdate } from './step_state';
import type {
  AnswerOutcome,
  ResearchOutcome,
  ToolPromptEntry,
  ToolRenderStateUpdate,
} from './transient_state';
import { extractToolReturn } from './utils/extract_tool_return';

export interface ResearchTurn {
  stepUpdates: RunStepUpdate[];
  outcome: ResearchOutcome;
  renderState: ToolRenderStateUpdate;
  pendingToolCallIds: string[];
}

export interface ToolNodeTurn {
  stepUpdates: RunStepUpdate[];
  renderState: ToolRenderStateUpdate;
  completedToolCallIds: string[];
  prompts: ToolPromptEntry[];
}

const invalidState = (message: string) =>
  createAgentExecutionError(message, AgentExecutionErrorCode.invalidState, {});

const emptyResponseError = (message: string) =>
  createAgentExecutionError(message, AgentExecutionErrorCode.emptyResponse, {});

// LangGraph's ToolNode appends "\n Please fix your mistakes." to tool error
// messages. The suffix leaks into user-surfaced errors; strip it here.
const LANGGRAPH_ERROR_SUFFIX = /\n Please fix your mistakes\.$/;
const stripLangGraphErrorSuffix = (content: string): string =>
  content.replace(LANGGRAPH_ERROR_SUFFIX, '');

const reasoningStep = (data: Omit<ReasoningStep, 'type'>): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  ...data,
});

/** Converts the research model's response into step updates plus the transient outcome. */
export const processResearchResponse = (
  message: AIMessageChunk,
  { cycle, toolManager }: { cycle: number; toolManager: ToolManager }
): ResearchTurn => {
  const text = extractTextContent(message);

  if (!message.tool_calls?.length) {
    // same branch order as before: any text is a handover; no text is an empty response
    if (!text) {
      return {
        stepUpdates: [],
        outcome: {
          type: 'retry_error',
          error: emptyResponseError('agent returned an empty response'),
        },
        renderState: {},
        pendingToolCallIds: [],
      };
    }
    return {
      stepUpdates: [],
      outcome: { type: 'handover', message: text, forceful: false },
      renderState: {},
      pendingToolCallIds: [],
    };
  }

  // strips `_reasoning` out of the args into `reasoning`
  const toolCalls = extractToolCallsWithReasoning(message);
  const toolCallGroupId = uuidv4();
  const updates: RunStepUpdate[] = [];
  const renderState: ToolRenderStateUpdate = {};
  const seen = new Set<string>();
  const mapping = toolManager.getToolIdMapping();

  if (text.trim().length > 0) {
    updates.push(
      stepUpdates.append(reasoningStep({ reasoning: text, tool_call_group_id: toolCallGroupId }))
    );
  }

  for (const toolCall of toolCalls) {
    if (seen.has(toolCall.toolCallId)) {
      throw invalidState(
        `[research] duplicate tool_call_id "${toolCall.toolCallId}" in model response`
      );
    }
    seen.add(toolCall.toolCallId);

    const toolId = toolIdentifierFromToolCall(toolCall, mapping);
    const isBrowser = toolId.startsWith(BROWSER_TOOL_PREFIX);
    const isDedicated = TOOLS_WITH_DEDICATED_STEP_LIFECYCLE.has(toolId);

    if (toolCall.reasoning && toolCall.reasoning.trim().length > 0) {
      updates.push(
        stepUpdates.append(
          reasoningStep({
            reasoning: toolCall.reasoning,
            tool_call_id: toolCall.toolCallId,
            tool_call_group_id: toolCallGroupId,
          })
        )
      );
    }

    // Every call gets a step so the ToolNode reply — including a schema-validation error for a
    // dedicated-lifecycle tool such as ask_user_question — always has something to resolve and
    // render back to the model. `kind` decides whether the step is durable (see `persistableSteps`).
    const meta = toolManager.getToolMeta(toolId);
    const step: ToolCallStep = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: toolCall.toolCallId,
      tool_id: isBrowser ? toolId.slice(BROWSER_TOOL_PREFIX.length) : toolId,
      params: toolCall.args,
      results: [],
      progression: [],
      tool_call_group_id: toolCallGroupId,
      tool_origin: meta?.origin,
      tool_type: meta?.type,
    };
    updates.push(stepUpdates.appendToolCall(step));

    renderState[toolCall.toolCallId] = {
      toolName: toolCall.toolName,
      kind: isDedicated ? 'dedicated' : isBrowser ? 'browser' : 'server',
      cycle,
    };
  }

  return {
    stepUpdates: updates,
    outcome: { type: 'tool_calls', toolCalls, toolCallGroupId },
    renderState,
    pendingToolCallIds: toolCalls.map((toolCall) => toolCall.toolCallId),
  };
};

/** What `ToolNode.invoke` returns depending on how it was invoked: a message list or a `{ messages }` state. */
export type ToolNodeResult = BaseMessage[] | { messages: BaseMessage[] };

const toToolMessages = (toolNodeResult: ToolNodeResult): ToolMessage[] =>
  (Array.isArray(toolNodeResult) ? toolNodeResult : toolNodeResult.messages).filter(isToolMessage);

/** `artifact` is untyped on LangChain's `ToolMessage`; this is the parsing boundary. */
const extractInterruptPrompt = (artifact: unknown): PromptRequest | undefined => {
  const toolReturn = artifact as ToolHandlerReturn | undefined;
  if (toolReturn && isToolHandlerInterruptReturn(toolReturn)) {
    return toolReturn.prompt;
  }
  return undefined;
};

/** Converts the ToolNode result into resolutions, question steps and interrupt prompts. */
export const processToolNodeResponse = (
  toolNodeResult: ToolNodeResult,
  {
    cycle,
    drainProgress,
    toolIdFor,
  }: {
    cycle: number;
    drainProgress: (toolCallId: string) => ToolCallProgress[];
    /** Returns the internal tool id (browser-prefixed for browser tools) of a tool call of this run. */
    toolIdFor: (toolCallId: string) => string;
  }
): ToolNodeTurn => {
  const toolMessages = toToolMessages(toolNodeResult);
  const updates: RunStepUpdate[] = [];
  const renderState: ToolRenderStateUpdate = {};
  const completedToolCallIds: string[] = [];
  const prompts: ToolPromptEntry[] = [];

  for (const message of toolMessages) {
    const toolCallId = message.tool_call_id;
    const interruptPrompt = extractInterruptPrompt(message.artifact);
    if (interruptPrompt) {
      prompts.push({ toolCallId, prompt: interruptPrompt });
      if (isAskUserQuestionPrompt(interruptPrompt)) {
        updates.push(
          stepUpdates.upsertQuestion(
            createAskUserQuestionStep({
              prompt_id: interruptPrompt.id,
              questions: interruptPrompt.questions,
            })
          )
        );
      }
      continue;
    }

    const content = stripLangGraphErrorSuffix(extractTextContent(message));
    // A malformed artifact is a tool bug: let it fail the run loudly rather than persist a step
    // with no results while the model reads the raw content.
    const results = extractToolReturn({ content, artifact: message.artifact }).results ?? [];
    updates.push(
      stepUpdates.resolveToolCall({
        toolCallId,
        toolId: toolIdFor(toolCallId),
        results,
        progression: drainProgress(toolCallId),
      })
    );
    renderState[toolCallId] = { content, cycle };
    completedToolCallIds.push(toolCallId);
  }

  return { stepUpdates: updates, renderState, completedToolCallIds, prompts };
};

/** Converts the structured-answer model response into the transient answer outcome. */
export const processStructuredAnswerResponse = (response: unknown): AnswerOutcome => {
  const retry = (message: string): AnswerOutcome => ({
    type: 'retry_error',
    error: emptyResponseError(message),
  });
  try {
    if (response && typeof response === 'object') {
      // A structured response with no fields (e.g. the model emitted an empty tool call `{}`)
      // is not a usable answer. Treat it as an empty response so the answer agent retries.
      if (Object.keys(response).length === 0) {
        return retry('agent returned an empty structured response');
      }
      return { type: 'structured_answer', data: response };
    }
    return retry('agent returned an invalid structured response');
  } catch (error) {
    return retry(
      `Error processing structured response: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
