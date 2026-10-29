/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTimelineEvent,
  ConversationEvent,
  ConversationRoundStep,
  ExecutionTerminatedEvent,
  PromptResponseEvent,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isAskUserQuestionStep,
  isCurrentFormatAttachmentEvent,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';

/** Something a pause waits on: a tool call to confirm or authorize, or a question to answer. */
export type PausedItem =
  | { type: 'tool_call'; tool_call_id: string }
  | { type: 'question'; prompt_id: string };

/** `prompt_response` id → the items of the pause it answers. */
export type ResumeAnchors = ReadonlyMap<string, PausedItem[]>;

/** The items a pause waits on: its resume state's tool calls, then its `ask_user_question` prompts. */
export const pausedItems = (terminated: ExecutionTerminatedEvent): PausedItem[] => {
  const { state, outcome } = terminated.data;
  const toolCalls = (state?.agent.nodes ?? []).map(
    (node): PausedItem => ({ type: 'tool_call', tool_call_id: node.tool_call_id })
  );
  const questions =
    outcome.type === 'prompt_requested'
      ? outcome.prompts
          .filter(isAskUserQuestionPrompt)
          .map((prompt): PausedItem => ({ type: 'question', prompt_id: prompt.id }))
      : [];
  return [...toolCalls, ...questions];
};

/** Resume anchors of stored events; needs raw events, since folding drops `prompt_response`. */
export const buildResumeAnchors = (
  events: ReadonlyArray<ConversationEvent>
): Map<string, PausedItem[]> => {
  const terminals = new Map<string, ExecutionTerminatedEvent>();
  for (const event of events) {
    if (event.type === TimelineEventType.executionTerminated) {
      terminals.set(event.id, event as ExecutionTerminatedEvent);
    }
  }
  const anchors = new Map<string, PausedItem[]>();
  for (const event of events) {
    if (event.type !== TimelineEventType.promptResponse) {
      continue;
    }
    const terminal = terminals.get((event as PromptResponseEvent).data.prompt_requested_event_id);
    if (terminal) {
      anchors.set(event.id, pausedItems(terminal));
    }
  }
  return anchors;
};

/** Sent with the round's user message: rendered inside it (`data.attachment_events`), not placed here. */
const isInputLinkedTo = (event: AttachmentTimelineEvent, messageId: string | undefined): boolean =>
  event.data.source === 'chat_input' &&
  messageId !== undefined &&
  event.trigger_event_id === messageId;

export interface RoundAttachmentPlacement {
  /** Rendered after the tool results of the group containing the call. */
  afterToolCall: Map<string, AttachmentTimelineEvent[]>;
  /** Rendered after the answered question's tool result. */
  afterQuestion: Map<string, AttachmentTimelineEvent[]>;
  /** Rendered after the round's outcome; not visible during the run that produced them. */
  afterOutcome: AttachmentTimelineEvent[];
}

const isItemStep = (step: ConversationRoundStep, item: PausedItem): boolean =>
  item.type === 'tool_call'
    ? isToolCallStep(step) && step.tool_call_id === item.tool_call_id
    : isAskUserQuestionStep(step) && step.prompt_id === item.prompt_id;

/** The paused item rendered last among `steps`, or undefined when none of them is there. */
const lastPausedItem = (
  steps: ConversationRoundStep[],
  items: PausedItem[]
): PausedItem | undefined => {
  for (let index = steps.length - 1; index >= 0; index--) {
    const match = items.find((item) => isItemStep(steps[index], item));
    if (match) {
      return match;
    }
  }
  return undefined;
};

const push = (
  map: Map<string, AttachmentTimelineEvent[]>,
  key: string,
  event: AttachmentTimelineEvent
) => map.set(key, [...(map.get(key) ?? []), event]);

/**
 * Where each attachment event of a round renders, from its links only (never its position or
 * execution id). The same input yields the same placement during the run and on later turns.
 */
export const placeRoundAttachmentEvents = ({
  steps,
  events,
  resumeAnchors,
  userMessageId,
}: {
  steps: ConversationRoundStep[];
  events: readonly AttachmentTimelineEvent[];
  resumeAnchors: ResumeAnchors;
  /** The round's user message, whose input events render inside it. */
  userMessageId?: string;
}): RoundAttachmentPlacement => {
  const placement: RoundAttachmentPlacement = {
    afterToolCall: new Map(),
    afterQuestion: new Map(),
    afterOutcome: [],
  };
  const toolCallIds = new Set(steps.filter(isToolCallStep).map((step) => step.tool_call_id));
  for (const event of events) {
    if (!isCurrentFormatAttachmentEvent(event) || isInputLinkedTo(event, userMessageId)) {
      continue;
    }
    if (event.data.source === 'chat_input') {
      const items = event.trigger_event_id ? resumeAnchors.get(event.trigger_event_id) : undefined;
      const anchor = items ? lastPausedItem(steps, items) : undefined;
      if (anchor?.type === 'tool_call') {
        push(placement.afterToolCall, anchor.tool_call_id, event);
      } else if (anchor?.type === 'question') {
        push(placement.afterQuestion, anchor.prompt_id, event);
      } else {
        placement.afterOutcome.push(event);
      }
      continue;
    }
    if (event.data.tool_call_id !== undefined && toolCallIds.has(event.data.tool_call_id)) {
      push(placement.afterToolCall, event.data.tool_call_id, event);
      continue;
    }
    placement.afterOutcome.push(event);
  }
  return placement;
};
