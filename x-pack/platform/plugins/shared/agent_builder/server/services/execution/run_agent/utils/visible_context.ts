/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BaseMessage } from '@langchain/core/messages';
import {
  isDeliveredMessageStep,
  isPreExecutionWorkflowStep,
  type DynamicToolDefinition,
} from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
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
import {
  standaloneEventToLangchain,
  standaloneUserMessageToLangchain,
  formatUserInput,
  noticeRendererFor,
  prepareMessages,
  roundAttachmentPlacement,
  roundOutcomeMessage,
  roundOutcomeNotice,
} from './to_langchain_messages';
import { formatDeliveredMessageNotice } from '../prompts/utils/notices';
import {
  createPreExecutionWorkflowContextMessage,
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
  // the answer agent has no tools, so it should not get dynamic tool definitions
  const notices = noticeRendererFor(conversation, { withToolDefinitions: phase === 'research' });
  const dynamicToolDefinitions =
    phase === 'research' ? await researchDynamicToolDefinitions(conversation, run) : undefined;
  const history = await prepareMessages({
    conversation,
    roundResultTransformer: view.historyTransformer,
    compactionSummary: run.compactionSummary,
    dynamicToolDefinitions,
    visibility: view.visibility,
    conversationTimestamp,
    attachmentNotices: notices,
  });
  const current = await renderCurrentRun({
    run,
    phase,
    handover,
    imageResolver,
    range: { start: view.visibility.currentFromStep },
    substitution: view.substitution,
    attachments: { notices, resumeAnchors: conversation.resumeAnchors ?? new Map() },
  });
  return [...history, ...pinnedCurrentRunMessages(run, view.visibility), ...current];
};

/**
 * The definitions the notice ahead of the history carries: the summary's snapshot, then the bound
 * tools no event announces that the snapshot does not already carry (a summary stored before bound
 * tools were dynamic lacks them). Resolved now, as the run's tools may have changed the attachments.
 */
const researchDynamicToolDefinitions = async (
  conversation: ProcessedConversation,
  run: CurrentRun
): Promise<DynamicToolDefinition[]> => {
  const snapshot = run.compactionSummary?.dynamic_tools ?? [];
  const carried = new Set(snapshot.map((definition) => definition.tool_id));
  const unannounced = ((await conversation.unannouncedBoundToolDefinitions?.()) ?? []).filter(
    (definition) => !carried.has(definition.tool_id)
  );
  return [...snapshot, ...unannounced];
};

/**
 * What stays with the current request when the summary covers its cycle: the run's workflow model
 * context and the steers it read. Pinned once, here, so the per-cycle units never carry them.
 */
const pinnedCurrentRunMessages = (
  { steps }: CurrentRun,
  { currentFromStep }: ContextVisibility
): BaseMessage[] =>
  steps.slice(0, currentFromStep).flatMap((step) => {
    if (isPreExecutionWorkflowStep(step) && step.model_context) {
      return [createPreExecutionWorkflowContextMessage(step.model_context)];
    }
    if (isDeliveredMessageStep(step)) {
      return [createUserMessage(formatDeliveredMessageNotice(step))];
    }
    return [];
  });

/**
 * One unit of the visible context, rendered as it is sent (images aside), except for the attachment
 * type instructions: those are given once per prompt, so a unit cannot know whether they land in it.
 */
export const renderUnit = async (
  unit: ContextUnit,
  {
    view,
    run,
    conversation,
  }: { view: ContextView; run: CurrentRun; conversation: ProcessedConversation }
): Promise<BaseMessage[]> => {
  const notices = noticeRendererFor(conversation, { withTypeInstructions: false });
  if (unit.kind === 'message') {
    return [standaloneUserMessageToLangchain(unit.entry.userMessage, notices)];
  }
  if (unit.kind === 'standalone_event') {
    return [standaloneEventToLangchain(unit.entry.event, notices)];
  }
  if (unit.kind === 'current_cycle') {
    return renderCurrentRun({
      run,
      phase: 'research',
      range: unit.range,
      substitution: view.substitution,
      attachments: { notices, resumeAnchors: conversation.resumeAnchors ?? new Map() },
    });
  }
  const { round } = unit;
  const placement = roundAttachmentPlacement(round, conversation.resumeAnchors);
  return [
    ...(unit.first ? [roundUserMessage(unit, conversation)] : []),
    ...(await renderHistorySteps({
      steps: unitSteps(unit, run.steps),
      resultTransformer: view.historyTransformer(round.id),
      attachments: { placement, notices },
    })),
    ...(unit.last ? [roundOutcomeMessage(round), ...roundOutcomeNotice(placement, notices)] : []),
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
    notices: noticeRendererFor(conversation, { withTypeInstructions: false }),
  });
