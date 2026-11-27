/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTimelineEvent, TimelineEvent } from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isExecutionTerminalEvent,
  isToolCallStep,
} from '@kbn/agent-builder-common';

/** Index of the last step of each tool call's group, keyed by tool call id. */
const groupEndByToolCall = (events: TimelineEvent[]): Map<string, number> => {
  const calls = events.flatMap((event, index) =>
    event.type === TimelineEventType.executionStep && isToolCallStep(event.data.step)
      ? [{ step: event.data.step, index }]
      : []
  );
  const groupEnds = new Map<string, number>();
  for (const { step, index } of calls) {
    if (step.tool_call_group_id) {
      groupEnds.set(step.tool_call_group_id, index);
    }
  }
  return new Map(
    calls.map(({ step, index }) => {
      const groupEnd = step.tool_call_group_id ? groupEnds.get(step.tool_call_group_id) : undefined;
      return [step.tool_call_id, groupEnd ?? index];
    })
  );
};

/**
 * Inserts an execution's attachment events into its persisted batch (trigger + execution events)
 * where they happened: input events right after their trigger, a tool call's events after its
 * tool call group, everything else right before the terminal event. Events sharing a position
 * keep their drain order.
 */
export const interleaveAttachmentEvents = (
  events: TimelineEvent[],
  attachmentEvents: AttachmentTimelineEvent[]
): TimelineEvent[] => {
  if (attachmentEvents.length === 0) {
    return events;
  }
  const indexById = new Map(events.map((event, index) => [event.id, index]));
  const groupEndByCall = groupEndByToolCall(events);
  const terminalIndex = events.findIndex(isExecutionTerminalEvent);
  const beforeTerminal = (terminalIndex === -1 ? events.length : terminalIndex) - 1;

  const positionOf = ({ data, trigger_event_id: triggerEventId }: AttachmentTimelineEvent) => {
    if (data.source === 'chat_input' && triggerEventId !== undefined) {
      const triggerIndex = indexById.get(triggerEventId);
      if (triggerIndex !== undefined) {
        return triggerIndex;
      }
    }
    if (data.tool_call_id !== undefined) {
      const groupEnd = groupEndByCall.get(data.tool_call_id);
      if (groupEnd !== undefined) {
        return groupEnd;
      }
    }
    return beforeTerminal;
  };

  const insertedAfter = new Map<number, AttachmentTimelineEvent[]>();
  for (const event of attachmentEvents) {
    const position = positionOf(event);
    insertedAfter.set(position, [...(insertedAfter.get(position) ?? []), event]);
  }
  return [
    ...(insertedAfter.get(-1) ?? []),
    ...events.flatMap((event, index) => [event, ...(insertedAfter.get(index) ?? [])]),
  ];
};
