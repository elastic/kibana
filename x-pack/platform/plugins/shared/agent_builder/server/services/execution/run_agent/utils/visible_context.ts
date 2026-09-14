/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { ToolCallWithResult } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { ToolManager, ToolResultStore } from '@kbn/agent-builder-server/runner';
import { createAIMessage, createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import type { ResearchAgentAction, ToolCallAction } from '../actions';
import { isExecuteToolAction, isToolCallAction } from '../actions';
import type { CompactionCoverage, CompactionSummaryData } from '../state';
import type { PromptImageResolver } from '../prompts/types';
import { formatResearcherActionHistory, reconstructToolCall } from '../prompts/utils/actions';
import type { ProcessedConversation } from './prepare_conversation';
import type { ProcessedTimelineEvent, TimelineCycle } from './context_timeline';
import { prepareMessages, stepsToMessages } from './to_langchain_messages';
import type { ToolCallResultTransformer } from './tool_summarization';
import { collectSubstitutionMarks, createMarkedResultTransformer } from './filestore_substitution';

export interface VisibleContextDeps {
  resultStore: ToolResultStore;
  toolManager: ToolManager;
  /** Base transformer (tool-specific summarization); substitution marks are layered on top. */
  resultTransformer: ToolCallResultTransformer;
  logger: Logger;
}

export interface VisibleContextInput {
  conversation: ProcessedConversation;
  actions: ResearchAgentAction[];
  cycleLimit: number;
  compactionSummary?: CompactionSummaryData;
  compactionCoverage?: CompactionCoverage;
  conversationTimestamp?: string;
  imageResolver?: PromptImageResolver;
}

export interface VisibleContext {
  /** Summary exchange + visible previous rounds + the current round's user input. */
  history: BaseMessage[];
  /** The in-flight round's visible actions. */
  inFlight: BaseMessageLike[];
}

/** The transformer every renderer must use so marks apply uniformly to history and in-flight results. */
export const createContextTransformer = (
  { conversation, actions }: Pick<VisibleContextInput, 'conversation' | 'actions'>,
  { resultStore, resultTransformer, logger }: VisibleContextDeps
): ToolCallResultTransformer =>
  createMarkedResultTransformer({
    marks: collectSubstitutionMarks({ timeline: conversation.timeline, actions }),
    resultStore,
    base: resultTransformer,
    logger,
  });

export const firstVisibleActionIndex = (coverage?: CompactionCoverage): number =>
  coverage && 'actionIndex' in coverage ? coverage.actionIndex + 1 : 0;

export const buildVisibleContext = async (
  input: VisibleContextInput,
  deps: VisibleContextDeps
): Promise<VisibleContext> => {
  const transformer = createContextTransformer(input, deps);

  const history = await prepareMessages({
    conversation: input.conversation,
    resultTransformer: transformer,
    compactionSummary: input.compactionSummary,
    compactionCoverage: input.compactionCoverage,
    conversationTimestamp: input.conversationTimestamp,
  });

  const inFlight = await formatResearcherActionHistory({
    actions: input.actions,
    cycleLimit: input.cycleLimit,
    resultTransformer: transformer,
    toolManager: deps.toolManager,
    imageResolver: input.imageResolver,
    fromActionIndex: firstVisibleActionIndex(input.compactionCoverage),
  });

  return { history, inFlight };
};

/** Inclusive index range into the actions array. */
export interface ActionCycle {
  start: number;
  end: number;
}

/**
 * A new cycle starts at every `ToolCallAction` (except when it is the very first action);
 * whatever precedes the first tool call belongs to cycle 0, trailing actions join the last cycle.
 */
export const groupActionCycles = (actions: ResearchAgentAction[]): ActionCycle[] => {
  if (actions.length === 0) {
    return [];
  }
  const starts = [0];
  for (let i = 1; i < actions.length; i++) {
    if (isToolCallAction(actions[i])) {
      starts.push(i);
    }
  }
  return starts.map((start, k) => ({ start, end: (starts[k + 1] ?? actions.length) - 1 }));
};

/** Structured tool calls of the in-flight actions in `[start, end]` (defaults to all). */
export const reconstructInFlightToolCalls = (
  actions: ResearchAgentAction[],
  toolIdMapping: Map<string, string>,
  range: ActionCycle = { start: 0, end: actions.length - 1 }
): ToolCallWithResult[] => {
  const toolCalls: ToolCallWithResult[] = [];
  let lastToolCall: ToolCallAction | undefined;
  for (let i = range.start; i <= range.end; i++) {
    const action = actions[i];
    if (isToolCallAction(action)) {
      lastToolCall = action;
    } else if (isExecuteToolAction(action)) {
      for (const result of action.tool_results) {
        const toolCall = reconstructToolCall(result, lastToolCall, toolIdMapping);
        if (toolCall) toolCalls.push(toolCall);
      }
    }
  }
  return toolCalls;
};

export const renderTimelineCycle = async (
  cycle: TimelineCycle<ProcessedTimelineEvent>,
  { resultTransformer }: { resultTransformer: ToolCallResultTransformer }
): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];
  for (const event of cycle.events) {
    if (event.type === TimelineEventType.userMessage) {
      messages.push(createUserMessage(event.data.message ?? ''));
    }
  }
  messages.push(...(await stepsToMessages(cycle.steps, { resultTransformer })));
  for (const event of cycle.events) {
    if (
      event.type === TimelineEventType.executionTerminated &&
      event.data.outcome.type === 'responded'
    ) {
      messages.push(createAIMessage(event.data.outcome.response.message));
    }
  }
  return messages;
};

export const renderActionCycle = (
  actions: ResearchAgentAction[],
  cycle: ActionCycle,
  {
    cycleLimit,
    resultTransformer,
    toolManager,
  }: { cycleLimit: number; resultTransformer: ToolCallResultTransformer; toolManager: ToolManager }
): Promise<BaseMessageLike[]> =>
  formatResearcherActionHistory({
    actions: actions.slice(0, cycle.end + 1),
    cycleLimit,
    resultTransformer,
    toolManager,
    fromActionIndex: cycle.start,
  });
