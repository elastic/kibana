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
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPromptResponse } from '@kbn/agent-builder-common/agents';
import { TimelineEventType, isAskUserQuestionStep } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';

export type AgentTurnStatus = 'running' | 'awaiting_prompt' | 'completed' | 'failed' | 'aborted';

export interface AgentTurnItem {
  kind: 'agentTurn';
  key: string;
  executionId?: string;
  triggerEventId?: string;
  status: AgentTurnStatus;
  startedAt: string;
  origin?: ConversationRoundOrigin;
  steps: ConversationRoundStep[];
  response?: { message: string };
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
  pendingPrompts?: PromptRequest[];
  timeToFirstToken?: number;
}

export type TimelineItem =
  | { kind: 'userMessage'; key: string; event: UserMessageEvent; isPending?: boolean }
  | AgentTurnItem;

const responseResolvesTerminal = (
  response: PromptResponseEvent | undefined,
  terminal: { id: string } | undefined
): response is PromptResponseEvent =>
  !!response && !!terminal && response.data.prompt_requested_event_id === terminal.id;

interface ExecutionAccumulator {
  executionId: string;
  startedAt: string;
  triggerEventId?: string;
  steps: ConversationRoundStep[];
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
}

const resolveStatus = (
  terminal: ExecutionAccumulator['terminal'],
  isAnswered: boolean
): AgentTurnStatus => {
  if (!terminal) return 'running';
  if (terminal.type === TimelineEventType.executionTerminated) {
    return terminal.data.outcome.type === 'prompt_requested' && !isAnswered
      ? 'awaiting_prompt'
      : 'completed';
  }
  if (terminal.type === TimelineEventType.executionFailed) return 'failed';
  return 'aborted';
};

const backfillAskUserQuestionAnswers = (
  steps: ConversationRoundStep[],
  responses: Record<string, PromptResponse>
): ConversationRoundStep[] => {
  let changed = false;
  const backfilled = steps.map((step) => {
    if (!isAskUserQuestionStep(step) || step.answers) return step;
    const response = responses[step.prompt_id];
    if (!response || !isAskUserQuestionPromptResponse(response)) return step;
    changed = true;
    return { ...step, answers: response.answers };
  });
  return changed ? backfilled : steps;
};

const accumulatorToItem = (
  acc: ExecutionAccumulator,
  eventsById: Map<string, TimelineEvent>,
  responsesByRequestId: Map<string, PromptResponseEvent>
): AgentTurnItem => {
  const { executionId, startedAt, triggerEventId, terminal } = acc;
  const origin: ConversationRoundOrigin | undefined = triggerEventId
    ? eventsById.get(triggerEventId)?.actor.origin
    : undefined;
  const answers = terminal ? responsesByRequestId.get(terminal.id)?.data.responses : undefined;
  const status = resolveStatus(terminal, answers !== undefined);
  const steps = answers ? backfillAskUserQuestionAnswers(acc.steps, answers) : acc.steps;
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
  if (
    status === 'completed' &&
    terminal?.type === TimelineEventType.executionTerminated &&
    terminal.data.outcome.type === 'responded'
  ) {
    item.response = terminal.data.outcome.response;
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

export const ACTIVE_EXECUTION_ITEM_KEY = 'active';

// Keyed by the persisted execution id as soon as it is known, so the saved item that replaces
// this one after the refetch keeps the same React identity.
export const activeExecutionToItem = (draft: ActiveExecutionDraft): AgentTurnItem => {
  const key = draft.executionId ?? ACTIVE_EXECUTION_ITEM_KEY;
  const startedAt = draft.startedAt ?? new Date().toISOString();
  const identity: Pick<AgentTurnItem, 'executionId' | 'triggerEventId'> = {};
  if (draft.executionId) identity.executionId = draft.executionId;
  if (draft.triggerEventId) identity.triggerEventId = draft.triggerEventId;

  if (draft.status === 'completed' && draft.terminalEvent) {
    const { terminalEvent } = draft;
    const matchedResponse = responseResolvesTerminal(draft.promptResponse, terminalEvent)
      ? draft.promptResponse
      : undefined;
    const answers = matchedResponse?.data.responses;
    const steps = answers ? backfillAskUserQuestionAnswers(draft.steps, answers) : draft.steps;
    const item: AgentTurnItem = {
      kind: 'agentTurn',
      key,
      ...identity,
      status: resolveStatus(terminalEvent, answers !== undefined),
      startedAt,
      steps,
      terminal: terminalEvent,
    };
    if (terminalEvent.data.outcome.type === 'responded') {
      item.response = terminalEvent.data.outcome.response;
    }
    if (terminalEvent.data.outcome.type === 'prompt_requested' && !answers) {
      const { prompts } = terminalEvent.data.outcome;
      if (prompts.length) item.pendingPrompts = prompts;
    }
    return item;
  }

  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key,
    ...identity,
    status: draft.status,
    startedAt,
    steps: draft.steps,
  };
  if (draft.message) item.response = { message: draft.message };
  if (draft.pendingPrompts?.length) item.pendingPrompts = draft.pendingPrompts;
  if (draft.timeToFirstToken !== undefined) item.timeToFirstToken = draft.timeToFirstToken;
  return item;
};

type UserEntry = Extract<TimelineItem, { kind: 'userMessage' }>;

export const groupTimelineEvents = (
  events: TimelineEvent[],
  eventsById: Map<string, TimelineEvent>,
  localPromptResponses: PromptResponseEvent[] = []
): TimelineItem[] => {
  const ordered: Array<UserEntry | ExecutionAccumulator> = [];
  const accMap = new Map<string, ExecutionAccumulator>();
  const responsesByRequestId = new Map<string, PromptResponseEvent>(
    localPromptResponses.map((event) => [event.data.prompt_requested_event_id, event])
  );

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
        responsesByRequestId.set(event.data.prompt_requested_event_id, event);
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

  return ordered.map((entry): TimelineItem => {
    if ('executionId' in entry) {
      return accumulatorToItem(entry, eventsById, responsesByRequestId);
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

export const isAwaitingPromptTurn = (
  item: AgentTurnItem
): item is AgentTurnItem & { status: 'awaiting_prompt'; pendingPrompts: PromptRequest[] } =>
  item.status === 'awaiting_prompt' && (item.pendingPrompts?.length ?? 0) > 0;

interface ToTimelineItemsParams {
  events: TimelineEvent[];
  pendingUserMessage?: UserMessageEvent | null;
  activeExecution?: ActiveExecutionDraft | null;
}

export const buildSavedItems = (
  events: TimelineEvent[],
  localPromptResponses: PromptResponseEvent[] = []
): TimelineItem[] => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return groupTimelineEvents(events, eventsById, localPromptResponses);
};

export const buildLiveItems = ({
  pendingUserMessage,
  activeExecution,
}: Omit<ToTimelineItemsParams, 'events'>): TimelineItem[] => {
  const items: TimelineItem[] = [];

  if (pendingUserMessage) {
    items.push({
      kind: 'userMessage',
      key: pendingUserMessage.id,
      event: pendingUserMessage,
      isPending: true,
    });
  }

  if (activeExecution) {
    items.push(activeExecutionToItem(activeExecution));
  } else if (pendingUserMessage) {
    items.push({
      kind: 'agentTurn',
      key: ACTIVE_EXECUTION_ITEM_KEY,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: [],
    });
  }

  return items;
};

export interface SavedReplacement {
  turn: boolean;
  userMessage: boolean;
}

export const findSavedReplacement = (
  savedItems: TimelineItem[],
  activeExecution: Pick<ActiveExecutionDraft, 'executionId' | 'triggerEventId'> | null | undefined
): SavedReplacement => {
  const executionId = activeExecution?.executionId;
  const triggerEventId = activeExecution?.triggerEventId;
  return {
    turn:
      executionId !== undefined &&
      savedItems.some((item) => item.kind === 'agentTurn' && item.executionId === executionId),
    userMessage:
      triggerEventId !== undefined &&
      savedItems.some((item) => item.kind === 'userMessage' && item.key === triggerEventId),
  };
};

const appendDraftItem = (items: TimelineItem[], draftItem: AgentTurnItem): void => {
  const alreadyPersisted = findSavedReplacement(items, draftItem).turn;
  if (!alreadyPersisted) {
    items.push(draftItem);
  }
};

export const assembleTimelineItems = (
  savedItems: TimelineItem[],
  liveItems: TimelineItem[]
): TimelineItem[] => {
  const items = [...savedItems];
  const liveTurn = liveItems.find((item): item is AgentTurnItem => item.kind === 'agentTurn');
  const { userMessage: userMessagePersisted } = findSavedReplacement(savedItems, liveTurn);
  for (const item of liveItems) {
    if (item.kind === 'agentTurn') {
      appendDraftItem(items, item);
    } else if (!(item.isPending && userMessagePersisted)) {
      items.push(item);
    }
  }
  return items;
};

export const isEventsAwaitingPrompt = (
  events: TimelineEvent[],
  extraResponses: PromptResponseEvent[] = []
): boolean => {
  let latestTerminal: TimelineEvent | undefined;
  const answeredTerminalIds = new Set<string>(
    extraResponses.map((response) => response.data.prompt_requested_event_id)
  );
  for (const event of events) {
    if (event.type === TimelineEventType.promptResponse) {
      answeredTerminalIds.add(event.data.prompt_requested_event_id);
    } else if (
      event.type === TimelineEventType.executionTerminated ||
      event.type === TimelineEventType.executionFailed ||
      event.type === TimelineEventType.executionAborted
    ) {
      latestTerminal = event;
    }
  }
  if (latestTerminal?.type !== TimelineEventType.executionTerminated) return false;
  return (
    latestTerminal.data.outcome.type === 'prompt_requested' &&
    !answeredTerminalIds.has(latestTerminal.id)
  );
};

export const toTimelineItems = ({
  events,
  pendingUserMessage,
  activeExecution,
}: ToTimelineItemsParams): TimelineItem[] => {
  const localPromptResponse = activeExecution?.promptResponse;
  return assembleTimelineItems(
    buildSavedItems(events, localPromptResponse ? [localPromptResponse] : []),
    buildLiveItems({ pendingUserMessage, activeExecution })
  );
};
