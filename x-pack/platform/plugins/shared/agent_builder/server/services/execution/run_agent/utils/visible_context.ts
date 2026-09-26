/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BaseMessage } from '@langchain/core/messages';
import type { ToolResultStore } from '@kbn/agent-builder-server/runner';
import type { HandoverParams, PromptImageResolver } from '../prompts/types';
import type { CurrentRun } from '../transient_state';
import type { ProcessedConversation } from './prepare_conversation';
import type { ToolCallResultTransformer } from './tool_summarization';
import {
  historyView,
  resolveVisibility,
  unitSteps,
  type ContextUnit,
  type ContextVisibility,
  type HistoryView,
} from './context_coverage';
import {
  collectSubstitutionMarks,
  createMarkedResultTransformer,
  substituteToolCallResults,
} from './filestore_substitution';
import { formatUserInput, prepareMessages, roundOutcomeMessage } from './to_langchain_messages';
import {
  renderCurrentRun,
  renderHistorySteps,
  type CurrentRunPhase,
  type CurrentRunSubstitution,
} from './render_steps_to_messages';

export interface VisibleContextDeps {
  resultStore: ToolResultStore;
  /** Base transformer (tool-specific summarization); substitution marks are layered on top. */
  resultTransformer: ToolCallResultTransformer;
  logger: Logger;
}

/** The context as the summary and the substitution marks leave it. */
export interface ContextView {
  history: HistoryView;
  visibility: ContextVisibility;
  /** `toolCallKey`s of the tool calls rendered as file references. */
  marks: Set<string>;
  /** Transformer for a history round's tool results: the base one, then the marks. */
  historyTransformer: (roundId: string) => ToolCallResultTransformer;
  substitution: CurrentRunSubstitution;
}

export const buildContextView = (
  {
    conversation,
    run,
    conversationTimestamp,
  }: { conversation: ProcessedConversation; run: CurrentRun; conversationTimestamp?: string },
  { resultStore, resultTransformer, logger }: VisibleContextDeps
): ContextView => {
  const history = historyView(conversation, conversationTimestamp);
  const marks = collectSubstitutionMarks({ timeline: conversation.timeline, steps: run.steps });
  return {
    history,
    visibility: resolveVisibility({
      entries: history.entries,
      roundId: run.roundId,
      steps: run.steps,
      cursor: run.compactionSummary?.summarized_up_to,
    }),
    marks,
    historyTransformer: createMarkedResultTransformer({
      marks,
      resultStore,
      base: resultTransformer,
      logger,
    }),
    substitution: {
      marks,
      substitute: (toolCall) => substituteToolCallResults({ toolCall, resultStore, logger }),
    },
  };
};

/** The messages the agent sees after its system prompt: history, then the current run. */
export const renderVisibleContext = async (
  {
    conversation,
    run,
    phase,
    handover,
    imageResolver,
    conversationTimestamp,
  }: {
    conversation: ProcessedConversation;
    run: CurrentRun;
    phase: CurrentRunPhase;
    handover?: HandoverParams;
    imageResolver?: PromptImageResolver;
    conversationTimestamp?: string;
  },
  deps: VisibleContextDeps
): Promise<BaseMessage[]> => {
  const view = buildContextView({ conversation, run, conversationTimestamp }, deps);
  const history = await prepareMessages({
    conversation,
    roundResultTransformer: view.historyTransformer,
    compactionSummary: run.compactionSummary,
    visibility: view.visibility,
    conversationTimestamp,
  });
  const current = await renderCurrentRun({
    run,
    phase,
    handover,
    imageResolver,
    range: { start: view.visibility.currentFromStep },
    substitution: view.substitution,
  });
  return [...history, ...current];
};

/** One unit of the visible context, rendered as it is sent (images aside). */
export const renderUnit = async (
  unit: ContextUnit,
  {
    view,
    run,
    conversation,
  }: { view: ContextView; run: CurrentRun; conversation: ProcessedConversation }
): Promise<BaseMessage[]> => {
  if (unit.kind === 'message') {
    return [
      formatUserInput({
        input: unit.entry.userMessage.data,
        timestamp: unit.entry.userMessage.created_at,
        attachmentTypes: conversation.attachmentTypes,
      }),
    ];
  }
  if (unit.kind === 'current_cycle') {
    return renderCurrentRun({
      run,
      phase: 'research',
      range: unit.range,
      substitution: view.substitution,
    });
  }
  const { round } = unit;
  return [
    ...(unit.first ? [roundUserMessage(unit, conversation)] : []),
    ...(await renderHistorySteps({
      steps: unitSteps(unit, run.steps),
      resultTransformer: view.historyTransformer(round.id),
    })),
    ...(unit.last ? [roundOutcomeMessage(round)] : []),
  ];
};

/** The user message of the round a history unit belongs to. */
export const roundUserMessage = (
  { round }: Extract<ContextUnit, { kind: 'round_cycle' }>,
  conversation: ProcessedConversation
): BaseMessage =>
  formatUserInput({
    input: round.userMessage.data,
    timestamp: round.userMessage.created_at,
    attachmentTypes: conversation.attachmentTypes,
  });
