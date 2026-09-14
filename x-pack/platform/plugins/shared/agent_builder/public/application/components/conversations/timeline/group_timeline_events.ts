/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TimelineEvent,
  UserMessageEvent,
  PromptResponseEvent,
  ExecutionTerminatedEvent,
  ExecutionFailedEvent,
  ExecutionAbortedEvent,
  ConversationRoundStep,
  ConversationRoundOrigin,
} from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';

export type TimelineItem =
  | { kind: 'userMessage'; key: string; event: UserMessageEvent; isPending?: boolean }
  | { kind: 'promptResponse'; key: string; event: PromptResponseEvent }
  | {
      kind: 'agentTurn';
      key: string;
      startedAt: string;
      /** Retained so toTimelineItems can resolve origin; not consumed by Timeline. */
      triggerEventId?: string;
      origin?: ConversationRoundOrigin;
      steps: ConversationRoundStep[];
      terminal: ExecutionTerminatedEvent;
    }
  | {
      kind: 'agentFailed';
      key: string;
      startedAt: string;
      triggerEventId?: string;
      origin?: ConversationRoundOrigin;
      terminal: ExecutionFailedEvent;
    }
  | {
      kind: 'agentAborted';
      key: string;
      startedAt: string;
      triggerEventId?: string;
      origin?: ConversationRoundOrigin;
      terminal: ExecutionAbortedEvent;
    }
  | {
      kind: 'agentRunning';
      key: string;
      startedAt: string;
      triggerEventId?: string;
      origin?: ConversationRoundOrigin;
      steps: ConversationRoundStep[];
    }
  | { kind: 'agentActive'; key: string; startedAt: string; draft: ActiveExecutionDraft };

/** Private per-execution accumulation shape; never exported. */
interface ExecutionAccumulator {
  executionId: string;
  startedAt: string;
  triggerEventId?: string;
  steps: ConversationRoundStep[];
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
}

const accumulatorToItem = (acc: ExecutionAccumulator): TimelineItem => {
  const { executionId, startedAt, triggerEventId, steps, terminal } = acc;
  const key = executionId;
  if (!terminal) {
    return { kind: 'agentRunning', key, startedAt, triggerEventId, steps };
  }
  if (terminal.type === TimelineEventType.executionTerminated) {
    return { kind: 'agentTurn', key, startedAt, triggerEventId, steps, terminal };
  }
  if (terminal.type === TimelineEventType.executionFailed) {
    return { kind: 'agentFailed', key, startedAt, triggerEventId, terminal };
  }
  return { kind: 'agentAborted', key, startedAt, triggerEventId, terminal };
};

/** Stable React key for the synthetic active-execution item; real executions carry UUIDs. */
export const ACTIVE_EXECUTION_ITEM_KEY = 'active';

type UserEntry =
  | Extract<TimelineItem, { kind: 'userMessage' }>
  | Extract<TimelineItem, { kind: 'promptResponse' }>;

/** Folds a flat event list into turn-shaped items, one per user event or agent execution. */
export const groupTimelineEvents = (events: TimelineEvent[]): TimelineItem[] => {
  const ordered: Array<UserEntry | ExecutionAccumulator> = [];
  const accMap = new Map<string, ExecutionAccumulator>();

  const getOrCreateAcc = (
    executionId: string,
    createdAt: string,
    triggerEventId?: string
  ): ExecutionAccumulator => {
    let acc = accMap.get(executionId);
    if (!acc) {
      acc = { executionId, startedAt: createdAt, triggerEventId, steps: [] };
      accMap.set(executionId, acc);
      ordered.push(acc);
    }
    return acc;
  };

  for (const event of events) {
    switch (event.type) {
      case TimelineEventType.userMessage:
        ordered.push({ kind: 'userMessage', key: event.id, event });
        break;

      case TimelineEventType.promptResponse:
        ordered.push({ kind: 'promptResponse', key: event.id, event });
        break;

      case TimelineEventType.executionStarted:
        if (!event.execution_id) break;
        getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        break;

      case TimelineEventType.executionStep: {
        if (!event.execution_id) break;
        const acc = getOrCreateAcc(event.execution_id, event.created_at, event.trigger_event_id);
        acc.steps.push(event.data.step);
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
        // Unknown non-user event types - skip without crashing.
        break;
    }
  }

  return ordered.map((entry): TimelineItem => {
    if ('executionId' in entry) {
      return accumulatorToItem(entry);
    }
    return entry;
  });
};

interface ToTimelineItemsParams {
  events: TimelineEvent[];
  pendingUserMessage?: UserMessageEvent | null;
  activeExecution?: ActiveExecutionDraft | null;
}

/**
 * Shapes raw conversation data into the flat TimelineItem[] that Timeline renders.
 * Resolves execution origins, appends synthetic items for pending messages and the
 * active stream, and covers the "agent starting" loading case.
 */
export const toTimelineItems = ({
  events,
  pendingUserMessage,
  activeExecution,
}: ToTimelineItemsParams): TimelineItem[] => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const baseItems = groupTimelineEvents(events);

  const resolveOrigin = (triggerEventId?: string): ConversationRoundOrigin | undefined =>
    triggerEventId ? eventsById.get(triggerEventId)?.actor.origin : undefined;

  const items: TimelineItem[] = baseItems.map((item): TimelineItem => {
    switch (item.kind) {
      case 'agentTurn':
        return { ...item, origin: resolveOrigin(item.triggerEventId) };
      case 'agentFailed':
        return { ...item, origin: resolveOrigin(item.triggerEventId) };
      case 'agentAborted':
        return { ...item, origin: resolveOrigin(item.triggerEventId) };
      case 'agentRunning':
        return { ...item, origin: resolveOrigin(item.triggerEventId) };
      default:
        return item;
    }
  });

  if (pendingUserMessage) {
    items.push({
      kind: 'userMessage',
      key: pendingUserMessage.id,
      event: pendingUserMessage,
      isPending: true,
    });

    if (activeExecution) {
      // Active stream arrived - show it with draft content.
      items.push({
        kind: 'agentActive',
        key: ACTIVE_EXECUTION_ITEM_KEY,
        startedAt: new Date().toISOString(),
        draft: activeExecution,
      });
    } else {
      // Message sent, stream not yet started - show the spinner with no content.
      items.push({
        kind: 'agentRunning',
        key: ACTIVE_EXECUTION_ITEM_KEY,
        startedAt: new Date().toISOString(),
        steps: [],
      });
    }
  } else if (activeExecution) {
    // Active execution without a pending user message (rare but possible).
    items.push({
      kind: 'agentActive',
      key: ACTIVE_EXECUTION_ITEM_KEY,
      startedAt: new Date().toISOString(),
      draft: activeExecution,
    });
  }

  return items;
};
