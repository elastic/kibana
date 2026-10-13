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
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import type { AgentTurnItem, AgentTurnStatus, ExecutionAccumulator, TerminalEvent } from './types';

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

const resolveStatus = (
  { terminal }: ExecutionAccumulator,
  awaitingPromptEventId?: string
): AgentTurnStatus => {
  if (!terminal) {
    return 'running';
  }
  if (terminal.type === TimelineEventType.executionTerminated) {
    if (
      terminal.data.outcome.type === 'prompt_requested' &&
      terminal.id === awaitingPromptEventId
    ) {
      return 'awaiting_prompt';
    }
    return 'completed';
  }
  if (terminal.type === TimelineEventType.executionFailed) return 'failed';
  return 'aborted';
};

export const accumulatorToItem = (
  acc: ExecutionAccumulator,
  eventsById: Map<string, TimelineDisplayEvent>,
  awaitingPromptEventId?: string
): AgentTurnItem => {
  const { executionId, startedAt, triggerEventId, steps, terminal, streaming, attachmentRefs } =
    acc;
  const trigger = triggerEventId ? eventsById.get(triggerEventId) : undefined;
  const origin: ConversationRoundOrigin | undefined = trigger?.actor.origin;
  const triggerAttachmentRefs =
    trigger?.type === TimelineEventType.userMessage ? trigger.data.attachment_refs : undefined;
  const status = resolveStatus(acc, awaitingPromptEventId);
  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key: executionId,
    executionId,
    status,
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

  if (
    status === 'awaiting_prompt' &&
    terminal?.type === TimelineEventType.executionTerminated &&
    terminal.data.outcome.type === 'prompt_requested'
  ) {
    item.pendingPrompts = terminal.data.outcome.prompts;
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
): item is AgentTurnItem & {
  status: 'awaiting_prompt';
  pendingPrompts: NonNullable<AgentTurnItem['pendingPrompts']>;
} => item.status === 'awaiting_prompt' && Array.isArray(item.pendingPrompts);
