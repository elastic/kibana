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
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';

export type AgentTurnStatus = 'running' | 'awaiting_prompt' | 'completed' | 'failed' | 'aborted';

export interface AgentTurnItem {
  kind: 'agentTurn';
  key: string;
  status: AgentTurnStatus;
  startedAt: string;
  origin?: ConversationRoundOrigin;
  steps: ConversationRoundStep[];
  response?: { message: string };
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
  transientReasoning?: string;
  pendingPrompts?: PromptRequest[];
  timeToFirstToken?: number;
}

export type ThreadItem =
  | { kind: 'userMessage'; key: string; event: UserMessageEvent; isPending?: boolean }
  | { kind: 'promptResponse'; key: string; event: PromptResponseEvent }
  | AgentTurnItem;

interface ExecutionAccumulator {
  executionId: string;
  startedAt: string;
  triggerEventId?: string;
  steps: ConversationRoundStep[];
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
}

const resolveStatus = (terminal: ExecutionAccumulator['terminal']): AgentTurnStatus => {
  if (!terminal) return 'running';
  if (terminal.type === TimelineEventType.executionTerminated) return 'completed';
  if (terminal.type === TimelineEventType.executionFailed) return 'failed';
  return 'aborted';
};

const accumulatorToItem = (
  acc: ExecutionAccumulator,
  eventsById: Map<string, TimelineEvent>
): AgentTurnItem => {
  const { executionId, startedAt, triggerEventId, steps, terminal } = acc;
  const origin: ConversationRoundOrigin | undefined = triggerEventId
    ? eventsById.get(triggerEventId)?.actor.origin
    : undefined;
  const status = resolveStatus(terminal);
  const item: AgentTurnItem = { kind: 'agentTurn', key: executionId, status, startedAt, steps };
  if (origin) item.origin = origin;
  if (terminal) item.terminal = terminal;
  if (
    status === 'completed' &&
    terminal?.type === TimelineEventType.executionTerminated &&
    terminal.data.outcome.type === 'responded'
  ) {
    item.response = terminal.data.outcome.response;
  }
  return item;
};

export const ACTIVE_EXECUTION_ITEM_KEY = 'active';

export const activeExecutionToItem = (draft: ActiveExecutionDraft): AgentTurnItem => {
  const key = draft.executionId ?? ACTIVE_EXECUTION_ITEM_KEY;
  const startedAt = draft.startedAt ?? new Date().toISOString();

  if (draft.status === 'completed' && draft.terminalEvent) {
    const { terminalEvent } = draft;
    const item: AgentTurnItem = {
      kind: 'agentTurn',
      key,
      status: 'completed',
      startedAt,
      steps: draft.steps,
      terminal: terminalEvent,
    };
    if (terminalEvent.data.outcome.type === 'responded') {
      item.response = terminalEvent.data.outcome.response;
    }
    return item;
  }

  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key,
    status: draft.status,
    startedAt,
    steps: draft.steps,
  };
  if (draft.message) item.response = { message: draft.message };
  if (draft.transientReasoning) item.transientReasoning = draft.transientReasoning;
  if (draft.pendingPrompts) item.pendingPrompts = draft.pendingPrompts;
  if (draft.timeToFirstToken !== undefined) item.timeToFirstToken = draft.timeToFirstToken;
  return item;
};

type UserEntry =
  | Extract<ThreadItem, { kind: 'userMessage' }>
  | Extract<ThreadItem, { kind: 'promptResponse' }>;

export const groupThreadEvents = (
  events: TimelineEvent[],
  eventsById: Map<string, TimelineEvent>
): ThreadItem[] => {
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
        break;
    }
  }

  return ordered.map((entry): ThreadItem => {
    if ('executionId' in entry) {
      return accumulatorToItem(entry, eventsById);
    }
    return entry;
  });
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

interface ToThreadItemsParams {
  events: TimelineEvent[];
  pendingUserMessage?: UserMessageEvent | null;
  activeExecution?: ActiveExecutionDraft | null;
}

const appendDraftItem = (items: ThreadItem[], activeExecution: ActiveExecutionDraft): void => {
  const draftItem = activeExecutionToItem(activeExecution);
  const alreadyPersisted =
    draftItem.key !== ACTIVE_EXECUTION_ITEM_KEY && items.some((it) => it.key === draftItem.key);
  if (!alreadyPersisted) {
    items.push(draftItem);
  }
};

export const toThreadItems = ({
  events,
  pendingUserMessage,
  activeExecution,
}: ToThreadItemsParams): ThreadItem[] => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const items: ThreadItem[] = groupThreadEvents(events, eventsById);

  if (pendingUserMessage) {
    items.push({
      kind: 'userMessage',
      key: pendingUserMessage.id,
      event: pendingUserMessage,
      isPending: true,
    });

    if (activeExecution) {
      appendDraftItem(items, activeExecution);
    } else {
      items.push({
        kind: 'agentTurn',
        key: ACTIVE_EXECUTION_ITEM_KEY,
        status: 'running',
        startedAt: new Date().toISOString(),
        steps: [],
      });
    }
  } else if (activeExecution) {
    appendDraftItem(items, activeExecution);
  }

  return items;
};
