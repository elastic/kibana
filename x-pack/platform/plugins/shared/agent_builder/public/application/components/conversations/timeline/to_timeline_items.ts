/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import {
  EXECUTION_STREAMING_EVENT_TYPE,
  isTimelineDisplayEvent,
} from '../../../../services/events';
import type {
  ExecutionAccumulator,
  GroupedItem,
  UnresolvedAttachmentItem,
  UnresolvedCustomEventItem,
  UserEntry,
} from './types';
import { accumulatorToItem, foldAttachmentRefs } from './timeline_item_utils';
import { findAwaitingPromptEventId } from './awaiting_prompt';
import { answersByPromptId, withQuestionAnswers } from './prompt_answers';
import { resolvedToolCallIds, isSupersededToolCallStep } from './tool_call_steps';
import { resumeToOriginalExecutionId } from './execution_chains';

export const groupTimelineEvents = (
  events: ConversationEvent[],
  eventsById: Map<string, TimelineDisplayEvent>,
  /** Id of the locally-built user message that has no saved twin yet. */
  pendingUserMessageId?: string
): GroupedItem[] => {
  // The run-shaped helpers only understand built-in events; narrow once, up front.
  const displayEvents = events.filter(isTimelineDisplayEvent);
  const awaitingPromptEventId = findAwaitingPromptEventId(displayEvents);
  const answers = answersByPromptId(displayEvents);
  const resolvedToolCalls = resolvedToolCallIds(displayEvents);
  const resumeLinks = resumeToOriginalExecutionId(displayEvents, eventsById);

  const ordered: Array<
    UserEntry | UnresolvedAttachmentItem | UnresolvedCustomEventItem | ExecutionAccumulator
  > = [];
  const accMap = new Map<string, ExecutionAccumulator>();
  const seenAttachmentRefs = new Map<string, AttachmentVersionRef>();

  const getOrCreateAcc = (
    executionId: string,
    createdAt: string,
    triggerEventId?: string
  ): ExecutionAccumulator => {
    const canonicalId = resumeLinks.get(executionId) ?? executionId;
    let acc = accMap.get(canonicalId);
    if (!acc) {
      acc = {
        executionId: canonicalId,
        startedAt: createdAt,
        triggerEventId,
        steps: [],
        attachmentRefs: Array.from(seenAttachmentRefs.values()),
      };
      accMap.set(canonicalId, acc);
      ordered.push(acc);
    }
    return acc;
  };

  for (const event of events) {
    if (!isTimelineDisplayEvent(event)) {
      // Whether the type has a UI here is the resolve step's call.
      ordered.push({ kind: 'customEvent', key: event.id, event });
      continue;
    }
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

      case TimelineEventType.attachmentAdded:
      case TimelineEventType.attachmentUpdated:
        // Only the server's explicit ask to show the attachment becomes an item. Whether the
        // attachment still exists and can draw is the resolve step's call.
        if (event.data.render_inline) {
          ordered.push({ kind: 'attachment', key: event.id, event });
        }
        break;

      case TimelineEventType.executionStarted: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.terminal = undefined;
        break;
      }

      case TimelineEventType.executionStep: {
        if (!event.execution_id) break;
        const { step } = event.data;
        if (isSupersededToolCallStep(step, resolvedToolCalls)) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.steps.push(withQuestionAnswers(step, answers));
        break;
      }

      case EXECUTION_STREAMING_EVENT_TYPE: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.streaming = event.data;
        break;
      }

      case TimelineEventType.executionTerminated: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.terminal = event;
        break;
      }

      case TimelineEventType.executionFailed:
      case TimelineEventType.executionAborted: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        // An interrupted resume ends the turn: the answer already closed the prompt, so the
        // interruption is the terminal the user sees, not the pause.
        acc.terminal = event;
        break;
      }

      default:
        break;
    }
  }

  return ordered.map(
    (entry): GroupedItem =>
      'executionId' in entry ? accumulatorToItem(entry, eventsById, awaitingPromptEventId) : entry
  );
};

/** Groups a timeline - saved events, live events, or both merged - into renderable items. */
export const buildItems = (
  events: ConversationEvent[],
  pendingUserMessageId?: string
): GroupedItem[] =>
  groupTimelineEvents(
    events,
    new Map(events.filter(isTimelineDisplayEvent).map((event) => [event.id, event])),
    pendingUserMessageId
  );
