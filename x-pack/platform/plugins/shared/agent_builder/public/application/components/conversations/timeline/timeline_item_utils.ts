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

export const resolveStatus = ({ terminal, streaming }: ExecutionAccumulator): AgentTurnStatus => {
  if (!terminal) {
    return streaming?.pending_prompts?.length ? 'awaiting_prompt' : 'running';
  }
  if (terminal.type === TimelineEventType.executionTerminated) return 'completed';
  if (terminal.type === TimelineEventType.executionFailed) return 'failed';
  return 'aborted';
};

export const accumulatorToItem = (
  acc: ExecutionAccumulator,
  eventsById: Map<string, TimelineDisplayEvent>
): AgentTurnItem => {
  const { executionId, startedAt, triggerEventId, steps, terminal, streaming, attachmentRefs } =
    acc;
  const trigger = triggerEventId ? eventsById.get(triggerEventId) : undefined;
  const origin: ConversationRoundOrigin | undefined = trigger?.actor.origin;
  const triggerAttachmentRefs =
    trigger?.type === TimelineEventType.userMessage ? trigger.data.attachment_refs : undefined;
  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key: executionId,
    executionId,
    status: resolveStatus(acc),
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

  const stillStreaming = terminal ? undefined : streaming;
  if (stillStreaming?.pending_prompts?.length) {
    item.pendingPrompts = stillStreaming.pending_prompts;
  }
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
