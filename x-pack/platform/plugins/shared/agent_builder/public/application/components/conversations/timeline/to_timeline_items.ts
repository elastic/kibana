/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { TimelineEventType, parseExecutionId } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import { EXECUTION_STREAMING_EVENT_TYPE } from '../../../../services/events';
import type { TurnAccumulator, TimelineItem, UserEntry } from './types';
import { accumulatorToItem, foldAttachmentRefs } from './timeline_item_utils';
import { answeredPauseIds } from './outstanding_prompt';
import { answersByPromptId, withQuestionAnswers } from './prompt_answers';

/**
 * The turn an execution belongs to. Every execution of a round shares one turn, so a pause and
 * the resume that answers it render as a single bubble.
 */
const turnIdOf = (executionId: string): string =>
  parseExecutionId(executionId)?.roundId ?? executionId;

export const groupTimelineEvents = (
  events: TimelineDisplayEvent[],
  eventsById: Map<string, TimelineDisplayEvent>,
  /** Id of the locally-built user message that has no saved twin yet. */
  pendingUserMessageId?: string
): TimelineItem[] => {
  const ordered: Array<UserEntry | TurnAccumulator> = [];
  const accMap = new Map<string, TurnAccumulator>();
  const seenAttachmentRefs = new Map<string, AttachmentVersionRef>();
  const answeredPauses = answeredPauseIds(events);
  const questionAnswers = answersByPromptId(events);

  const getOrCreateAcc = (
    executionId: string,
    createdAt: string,
    triggerEventId?: string
  ): TurnAccumulator => {
    const turnId = turnIdOf(executionId);
    const acc = accMap.get(turnId);
    if (!acc) {
      const created: TurnAccumulator = {
        turnId,
        executionId,
        startedAt: createdAt,
        triggerEventId,
        steps: [],
        attachmentRefs: Array.from(seenAttachmentRefs.values()),
      };
      accMap.set(turnId, created);
      ordered.push(created);
      return created;
    }
    if (acc.executionId !== executionId) {
      // A resume continues the turn, and its own outcome replaces the pause it answered.
      acc.executionId = executionId;
      acc.terminal = undefined;
      acc.streaming = undefined;
    }
    return acc;
  };

  for (const event of events) {
    switch (event.type) {
      case TimelineEventType.userMessage:
        foldAttachmentRefs(seenAttachmentRefs, event.data.attachment_refs);
        ordered.push({
          kind: 'userMessage',
          key: event.id,
          event,
          ...(event.id === pendingUserMessageId ? { isPending: true } : {}),
        });
        break;

      // An answer is not a timeline item of its own: a question answer shows on its
      // `ask_user_question` step, and a yes/no decision is not worth a bubble.
      case TimelineEventType.promptResponse:
        foldAttachmentRefs(seenAttachmentRefs, event.data.input?.attachment_refs);
        break;

      case TimelineEventType.executionStarted:
        if (!event.execution_id) break;
        getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        break;

      case TimelineEventType.executionStep: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.steps.push(withQuestionAnswers(event.data.step, questionAnswers));
        break;
      }

      case EXECUTION_STREAMING_EVENT_TYPE: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.streaming = event.data;
        break;
      }

      case TimelineEventType.executionTerminated:
      case TimelineEventType.executionFailed:
      case TimelineEventType.executionAborted: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.terminal = event;
        break;
      }

      default:
        break;
    }
  }

  return ordered.map(
    (entry): TimelineItem =>
      'turnId' in entry ? accumulatorToItem(entry, eventsById, answeredPauses) : entry
  );
};

/** Groups a timeline - saved events, live events, or both merged - into renderable items. */
export const buildItems = (
  events: TimelineDisplayEvent[],
  pendingUserMessageId?: string
): TimelineItem[] =>
  groupTimelineEvents(
    events,
    new Map(events.map((event) => [event.id, event])),
    pendingUserMessageId
  );
