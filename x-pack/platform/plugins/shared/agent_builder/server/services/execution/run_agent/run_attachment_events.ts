/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentEventSource,
  AttachmentTimelineEvent,
  Conversation,
  EventActor,
} from '@kbn/agent-builder-common';
import {
  EventActorType,
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  isAttachmentEvent,
  roundUserMessageEventId,
} from '@kbn/agent-builder-common';
import type {
  AttachmentChange,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import { attachmentChangesToEvents } from '@kbn/agent-builder-server/attachments';
import { nextResumeIndex, promptResponseEventId } from '../../conversation/client/rounds_to_events';
import { groupTimelineRounds, type AnyTimelineEvent } from './utils/context_timeline';

export interface RunAttachmentEventsOptions {
  attachmentStateManager: AttachmentStateManager;
  /** The round the run's events are persisted with (a resume: the paused round). */
  roundId: string;
  /** The run's trigger: the round's user message, or the `prompt_response` of a resume. */
  triggerEventId: string;
  /** Actor of the `chat_input` events. */
  inputActor: EventActor;
  /** Agent running the round; actor of the `execution` events. */
  agentId: string;
}

/**
 * Turns the run's attachment changes into timeline events at its drain points (incoming message,
 * each tool batch, execution end) and keeps every event it produced, for persistence.
 */
export class RunAttachmentEvents {
  private readonly events: AttachmentTimelineEvent[] = [];

  constructor(private readonly options: RunAttachmentEventsOptions) {}

  /** The incoming message's attachments; call once, right after `prepareConversation`. */
  drainChatInput(): AttachmentTimelineEvent[] {
    return this.materialize(this.options.attachmentStateManager.drainChanges(), 'chat_input');
  }

  /** The changes made by the given tool calls; those of other calls stay recorded. */
  drainToolCalls(toolCallIds: readonly string[]): AttachmentTimelineEvent[] {
    const ids = new Set(toolCallIds);
    return this.materialize(
      this.options.attachmentStateManager.drainChanges(
        (change: AttachmentChange) =>
          change.tool_call_id !== undefined && ids.has(change.tool_call_id)
      ),
      'execution'
    );
  }

  /** Everything not drained yet: changes outside a tool call, by nested calls, or by a batch that threw. */
  drainRemaining(): AttachmentTimelineEvent[] {
    return this.materialize(this.options.attachmentStateManager.drainChanges(), 'execution');
  }

  /** Every event produced so far, in drain order. */
  list(): AttachmentTimelineEvent[] {
    return [...this.events];
  }

  private materialize(
    changes: AttachmentChange[],
    source: Extract<AttachmentEventSource, 'chat_input' | 'execution'>
  ): AttachmentTimelineEvent[] {
    if (changes.length === 0) {
      return [];
    }
    const { roundId, triggerEventId, inputActor, agentId } = this.options;
    const events = attachmentChangesToEvents(changes, {
      source,
      actor: source === 'chat_input' ? inputActor : { type: EventActorType.agent, id: agentId },
      execution_id: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`,
      trigger_event_id: triggerEventId,
    });
    this.events.push(...events);
    return events;
  }
}

/**
 * The run's trigger id. A resume's `prompt_response` is only written when the resume ends, so its
 * id is computed the way `appendResumeExecution$` and `execution_started.ts` compute it.
 */
export const runTriggerEventId = ({
  conversation,
  pendingTurnId,
  roundId,
}: {
  conversation: Pick<Conversation, 'events'> | undefined;
  pendingTurnId?: string;
  roundId: string;
}): string =>
  pendingTurnId !== undefined && conversation
    ? promptResponseEventId(
        pendingTurnId,
        Math.max(1, nextResumeIndex(conversation, pendingTurnId))
      )
    : roundUserMessageEventId(roundId);

/**
 * The attachment events of a paused round's earlier executions, placed among the steps its resume
 * inherits. Those sent with the round's user message are left out: they render inside it.
 */
export const inheritedAttachmentEvents = <E extends AnyTimelineEvent>(
  timeline: E[],
  roundId: string
): AttachmentTimelineEvent[] => {
  const round = groupTimelineRounds(timeline).find((candidate) => candidate.id === roundId);
  if (!round) {
    return [];
  }
  return round.events
    .filter((event): event is E & AttachmentTimelineEvent => isAttachmentEvent(event))
    .filter(
      (event) =>
        !(event.data.source === 'chat_input' && event.trigger_event_id === round.userMessage.id)
    );
};
