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
import { findAwaitingPromptEventId } from './awaiting_prompt';
import { answersByPromptId, withQuestionAnswers } from './prompt_answers';
import { resolvedToolCallIds, isSupersededToolCallStep } from './tool_call_steps';
import { resumeToOriginalExecutionId } from './execution_chains';

export const groupTimelineEvents = (
  events: TimelineDisplayEvent[],
  eventsById: Map<string, TimelineDisplayEvent>,
  /** Id of the locally-built user message that has no saved twin yet. */
  pendingUserMessageId?: string
): TimelineItem[] => {
  const awaitingPromptEventId = findAwaitingPromptEventId(events);
  const answers = answersByPromptId(events);
  const resolvedToolCalls = resolvedToolCallIds(events);
  const resumeLinks = resumeToOriginalExecutionId(events, eventsById);

  const ordered: Array<UserEntry | ExecutionAccumulator> = [];
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
        const openPause = awaitingPromptEventId ? eventsById.get(awaitingPromptEventId) : undefined;
        const openPauseExecutionId = openPause?.execution_id
          ? resumeLinks.get(openPause.execution_id) ?? openPause.execution_id
          : undefined;
        acc.terminal =
          openPause?.type === TimelineEventType.executionTerminated &&
          openPauseExecutionId === acc.executionId
            ? openPause
            : event;
        break;
      }

      default:
        break;
    }
  }

  return ordered.map(
    (entry): TimelineItem =>
      'executionId' in entry ? accumulatorToItem(entry, eventsById, awaitingPromptEventId) : entry
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
