/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRoundOrigin,
  ExecutionTerminatedEvent,
  ExecutionFailedEvent,
  ExecutionAbortedEvent,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import type { AgentTurnItem, AgentTurnStatus, TurnAccumulator, TerminalEvent } from './types';
import { pausePrompts } from './outstanding_prompt';

const finalResponse = (terminal: TerminalEvent | undefined) =>
  terminal?.type === TimelineEventType.executionTerminated &&
  terminal.data.outcome.type === 'responded'
    ? terminal.data.outcome.response
    : undefined;

/**
 * Keeps the highest version seen per attachment, so a later turn resolves an attachment the way
 * the agent last saw it.
 */
export const foldAttachmentRefs = (
  seen: Map<string, AttachmentVersionRef>,
  refs: AttachmentVersionRef[] | undefined
): void => {
  for (const ref of refs ?? []) {
    const existing = seen.get(ref.attachment_id);
    if (!existing || ref.version > existing.version) {
      seen.set(ref.attachment_id, ref);
    }
  }
};

/** The prompts this turn still waits on; an answered pause waits on nothing. */
export const promptsAwaitingAnswer = (
  { terminal }: TurnAccumulator,
  answeredPauseIds: Set<string>
): PromptRequest[] => {
  if (!terminal || answeredPauseIds.has(terminal.id)) {
    return [];
  }
  return pausePrompts(terminal);
};

export const resolveStatus = (
  acc: TurnAccumulator,
  answeredPauseIds: Set<string>
): AgentTurnStatus => {
  const { terminal } = acc;
  if (terminal?.type === TimelineEventType.executionFailed) return 'failed';
  if (terminal?.type === TimelineEventType.executionAborted) return 'aborted';
  if (promptsAwaitingAnswer(acc, answeredPauseIds).length > 0) return 'awaiting_prompt';
  return terminal ? 'completed' : 'running';
};

export const accumulatorToItem = (
  acc: TurnAccumulator,
  eventsById: Map<string, TimelineDisplayEvent>,
  answeredPauseIds: Set<string>
): AgentTurnItem => {
  const {
    turnId,
    executionId,
    startedAt,
    triggerEventId,
    steps,
    terminal,
    streaming,
    attachmentRefs,
  } = acc;
  const trigger = triggerEventId ? eventsById.get(triggerEventId) : undefined;
  const origin: ConversationRoundOrigin | undefined = trigger?.actor.origin;
  const triggerAttachmentRefs =
    trigger?.type === TimelineEventType.userMessage ? trigger.data.attachment_refs : undefined;
  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key: turnId,
    executionId,
    status: resolveStatus(acc, answeredPauseIds),
    startedAt,
    steps,
  };
  if (triggerEventId) item.triggerEventId = triggerEventId;
  if (origin) item.origin = origin;
  if (terminal) item.terminal = terminal;
  if (attachmentRefs?.length) item.attachmentRefs = attachmentRefs;
  if (triggerAttachmentRefs?.length) item.triggerAttachmentRefs = triggerAttachmentRefs;

  const response = finalResponse(terminal);
  if (response) {
    item.response = response;
  } else if (streaming?.message) {
    item.response = { message: streaming.message };
  }

  const pendingPrompts = promptsAwaitingAnswer(acc, answeredPauseIds);
  if (pendingPrompts.length > 0) {
    item.pendingPrompts = pendingPrompts;
  }

  const stillStreaming = terminal ? undefined : streaming;
  if (stillStreaming?.time_to_first_token !== undefined) {
    item.timeToFirstToken = stillStreaming.time_to_first_token;
  }
  return item;
};

export const isCompletedTurn = (
  item: AgentTurnItem
): item is AgentTurnItem & { status: 'completed'; terminal: ExecutionTerminatedEvent } =>
  item.status === 'completed';

export const isFailedTurn = (
  item: AgentTurnItem
): item is AgentTurnItem & { status: 'failed'; terminal: ExecutionFailedEvent } =>
  item.status === 'failed';

export const isAbortedTurn = (
  item: AgentTurnItem
): item is AgentTurnItem & { status: 'aborted'; terminal: ExecutionAbortedEvent } =>
  item.status === 'aborted';

export const isAwaitingPromptTurn = (
  item: AgentTurnItem
): item is AgentTurnItem & { status: 'awaiting_prompt'; pendingPrompts: PromptRequest[] } =>
  item.status === 'awaiting_prompt' && (item.pendingPrompts?.length ?? 0) > 0;
