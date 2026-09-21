/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import { EXECUTION_STREAMING_EVENT_TYPE } from '../../../../services/events';
import type { ExecutionAccumulator, TimelineItem, UserEntry } from './types';
import { accumulatorToItem, foldAttachmentRefs } from './timeline_item_utils';
import { findOutstandingPrompt } from './outstanding_prompt';
import { answersByPromptId, withQuestionAnswers } from './prompt_answers';

export const groupTimelineEvents = (
  events: TimelineDisplayEvent[],
  eventsById: Map<string, TimelineDisplayEvent>,
  /** Id of the locally-built user message that has no saved twin yet. */
  pendingUserMessageId?: string
): TimelineItem[] => {
  const outstandingPromptRequestedEventId = findOutstandingPrompt(events)?.promptRequestedEventId;
  const answers = answersByPromptId(events);

  const ordered: Array<UserEntry | ExecutionAccumulator> = [];
  const accMap = new Map<string, ExecutionAccumulator>();
  const seenAttachmentRefs = new Map<string, AttachmentVersionRef>();

  const getOrCreateAcc = (
    executionId: string,
    createdAt: string,
    triggerEventId?: string
  ): ExecutionAccumulator => {
    let acc = accMap.get(executionId);
    if (!acc) {
      acc = {
        executionId,
        startedAt: createdAt,
        triggerEventId,
        steps: [],
        attachmentRefs: Array.from(seenAttachmentRefs.values()),
      };
      accMap.set(executionId, acc);
      ordered.push(acc);
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
        acc.steps.push(withQuestionAnswers(event.data.step, answers));
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
      'executionId' in entry
        ? accumulatorToItem(entry, eventsById, outstandingPromptRequestedEventId)
        : entry
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
