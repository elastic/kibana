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
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import {
  TimelineEventType,
  isAskUserQuestionStep,
  turnIdFromExecutionId,
} from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';

export type AgentTurnStatus = 'running' | 'awaiting_prompt' | 'completed' | 'failed' | 'aborted';

export interface AgentTurnItem {
  kind: 'agentTurn';
  key: string;
  /** The turn this item renders. One turn spans every execution of a HITL pause/resume. */
  turnId?: string;
  /** The executions folded into this turn, used to detect an already-persisted live draft. */
  executionIds?: string[];
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
  /** Highest version of every attachment referenced up to and including this turn's trigger. */
  attachmentRefs?: AttachmentVersionRef[];
  /** The trigger message's own refs, including attachments the agent created in this turn. */
  triggerAttachmentRefs?: AttachmentVersionRef[];
}

export type TimelineItem =
  | { kind: 'userMessage'; key: string; event: UserMessageEvent; isPending?: boolean }
  | AgentTurnItem;

interface TurnAccumulator {
  turnId: string;
  startedAt: string;
  triggerEventId?: string;
  /** Every execution folded into this turn, in order. */
  executionIds: string[];
  steps: ConversationRoundStep[];
  terminal?: ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;
  attachmentRefs?: AttachmentVersionRef[];
  /** Answers from every `prompt_response` in this turn, keyed by prompt id. */
  answers: Record<string, PromptResponse>;
  /**
   * Terminal event ids a `prompt_response` has answered. A turn can re-ask the same prompt, so
   * only the answered terminal tells us a pause is resolved — a prompt id cannot.
   */
  answeredTerminalIds: Set<string>;
}

// Keeps the highest version seen per attachment, so a later turn resolves an attachment the way
// the agent last saw it.
const foldAttachmentRefs = (
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

const resolveStatus = (
  terminal: TurnAccumulator['terminal'],
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

type ExecutionContent = Pick<
  AgentTurnItem,
  'status' | 'steps' | 'terminal' | 'response' | 'pendingPrompts'
>;

const toTurnContent = (
  steps: ConversationRoundStep[],
  terminal: TurnAccumulator['terminal'],
  answers: Record<string, PromptResponse> = {},
  answeredTerminalIds: ReadonlySet<string> = new Set()
): ExecutionContent => {
  const isAnswered = !!terminal && answeredTerminalIds.has(terminal.id);
  const content: ExecutionContent = {
    status: resolveStatus(terminal, isAnswered),
    steps: backfillAskUserQuestionAnswers(steps, answers),
  };
  if (terminal) content.terminal = terminal;
  if (terminal?.type === TimelineEventType.executionTerminated) {
    const { outcome } = terminal.data;
    if (outcome.type === 'responded') {
      content.response = outcome.response;
    } else if (!isAnswered && outcome.prompts.length) {
      content.pendingPrompts = outcome.prompts;
    }
  }
  return content;
};

const accumulatorToItem = (
  acc: TurnAccumulator,
  eventsById: Map<string, TimelineEvent>
): AgentTurnItem => {
  const { turnId, startedAt, triggerEventId, steps, terminal, attachmentRefs, answers } = acc;
  const { answeredTerminalIds } = acc;
  const trigger = triggerEventId ? eventsById.get(triggerEventId) : undefined;
  const origin: ConversationRoundOrigin | undefined = trigger?.actor.origin;
  const triggerAttachmentRefs =
    trigger?.type === TimelineEventType.userMessage ? trigger.data.attachment_refs : undefined;
  const item: AgentTurnItem = {
    kind: 'agentTurn',
    key: turnId,
    turnId,
    executionIds: acc.executionIds,
    startedAt,
    ...toTurnContent(steps, terminal, answers, answeredTerminalIds),
  };
  if (triggerEventId) item.triggerEventId = triggerEventId;
  if (origin) item.origin = origin;
  if (attachmentRefs?.length) item.attachmentRefs = attachmentRefs;
  if (triggerAttachmentRefs?.length) item.triggerAttachmentRefs = triggerAttachmentRefs;
  return item;
};

export const ACTIVE_EXECUTION_ITEM_KEY = 'active';

// Keyed by the turn id as soon as it is known, so the saved item that replaces this one after
// the refetch keeps the same React identity.
export const activeExecutionToItem = (draft: ActiveExecutionDraft): AgentTurnItem => {
  const turnId = draft.executionId ? turnIdFromExecutionId(draft.executionId) : undefined;
  const key = turnId ?? ACTIVE_EXECUTION_ITEM_KEY;
  const startedAt = draft.startedAt ?? new Date().toISOString();
  const identity: Pick<AgentTurnItem, 'turnId' | 'executionId' | 'triggerEventId'> = {};
  if (turnId) identity.turnId = turnId;
  if (draft.executionId) identity.executionId = draft.executionId;
  if (draft.triggerEventId) identity.triggerEventId = draft.triggerEventId;

  if (draft.status === 'completed' && draft.terminalEvent) {
    return {
      kind: 'agentTurn',
      key,
      ...identity,
      startedAt,
      ...toTurnContent(
        draft.steps,
        draft.terminalEvent,
        draft.promptResponse?.data.responses,
        draft.promptResponse
          ? new Set([draft.promptResponse.data.prompt_requested_event_id])
          : undefined
      ),
    };
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
  localPromptResponse?: PromptResponseEvent
): TimelineItem[] => {
  const ordered: Array<UserEntry | TurnAccumulator> = [];
  const accMap = new Map<string, TurnAccumulator>();
  const seenAttachmentRefs = new Map<string, AttachmentVersionRef>();

  const getOrCreateAcc = (
    turnId: string,
    createdAt: string,
    triggerEventId?: string
  ): TurnAccumulator => {
    let acc = accMap.get(turnId);
    if (!acc) {
      acc = {
        turnId,
        startedAt: createdAt,
        triggerEventId,
        executionIds: [],
        steps: [],
        answers: {},
        answeredTerminalIds: new Set(),
        attachmentRefs: Array.from(seenAttachmentRefs.values()),
      };
      accMap.set(turnId, acc);
      ordered.push(acc);
    }
    return acc;
  };

  /**
   * The turn accumulator a lifecycle event belongs to, creating it on first sight. A HITL pause
   * and its resume are separate executions of one turn, so both resolve to the same accumulator.
   */
  const accFor = (event: TimelineEvent & { execution_id: string }): TurnAccumulator => {
    const { execution_id: executionId } = event;
    const acc = getOrCreateAcc(
      turnIdFromExecutionId(executionId),
      event.created_at,
      event.trigger_event_id
    );
    if (!acc.executionIds.includes(executionId)) {
      acc.executionIds.push(executionId);
    }
    return acc;
  };

  /** The turn a prompt answers. A `prompt_response` has no execution of its own. */
  const answeredAcc = (response: PromptResponseEvent): TurnAccumulator | undefined => {
    const paused = eventsById.get(response.data.prompt_requested_event_id);
    return paused?.execution_id
      ? accMap.get(turnIdFromExecutionId(paused.execution_id))
      : undefined;
  };

  for (const event of events) {
    switch (event.type) {
      case TimelineEventType.userMessage:
        foldAttachmentRefs(seenAttachmentRefs, event.data.attachment_refs);
        ordered.push({ kind: 'userMessage', key: event.id, event });
        break;

      case TimelineEventType.promptResponse: {
        foldAttachmentRefs(seenAttachmentRefs, event.data.input?.attachment_refs);
        const answered = answeredAcc(event);
        if (answered) {
          Object.assign(answered.answers, event.data.responses);
          answered.answeredTerminalIds.add(event.data.prompt_requested_event_id);
        }
        break;
      }

      case TimelineEventType.executionStarted:
        if (!event.execution_id) break;
        accFor({ ...event, execution_id: event.execution_id });
        break;

      case TimelineEventType.executionStep:
        if (!event.execution_id) break;
        accFor({ ...event, execution_id: event.execution_id }).steps.push(event.data.step);
        break;

      case TimelineEventType.executionTerminated:
      case TimelineEventType.executionFailed:
      case TimelineEventType.executionAborted:
        if (!event.execution_id) break;
        // The turn's last terminal wins, so a resolved pause is replaced by the real outcome.
        accFor({ ...event, execution_id: event.execution_id }).terminal = event;
        break;

      default:
        break;
    }
  }

  // The answer being sent is not on the server timeline yet; it belongs to the paused turn.
  if (localPromptResponse) {
    const acc = answeredAcc(localPromptResponse);
    if (acc) {
      Object.assign(acc.answers, localPromptResponse.data.responses);
      acc.answeredTerminalIds.add(localPromptResponse.data.prompt_requested_event_id);
    }
  }

  return ordered.map(
    (entry): TimelineItem => ('turnId' in entry ? accumulatorToItem(entry, eventsById) : entry)
  );
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
  localPromptResponse?: PromptResponseEvent
): TimelineItem[] => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return groupTimelineEvents(events, eventsById, localPromptResponse);
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
      savedItems.some(
        (item) => item.kind === 'agentTurn' && !!item.executionIds?.includes(executionId)
      ),
    userMessage:
      triggerEventId !== undefined &&
      savedItems.some((item) => item.kind === 'userMessage' && item.key === triggerEventId),
  };
};

/** The live execution continues the turn already on screen, so it extends that item. */
const foldDraftIntoTurn = (saved: AgentTurnItem, draft: AgentTurnItem): AgentTurnItem => ({
  ...saved,
  status: draft.status,
  steps: [...saved.steps, ...draft.steps],
  response: draft.response ?? saved.response,
  terminal: draft.terminal ?? saved.terminal,
  pendingPrompts: draft.pendingPrompts,
});

const applyDraftItem = (items: TimelineItem[], draftItem: AgentTurnItem): void => {
  const { turnId, executionId } = draftItem;
  const index = turnId
    ? items.findIndex((item) => item.kind === 'agentTurn' && item.turnId === turnId)
    : -1;
  if (index === -1) {
    items.push(draftItem);
    return;
  }
  const saved = items[index] as AgentTurnItem;
  // The refetch already folded this execution into the saved turn; the saved copy wins.
  if (executionId && saved.executionIds?.includes(executionId)) {
    return;
  }
  items[index] = foldDraftIntoTurn(saved, draftItem);
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
      applyDraftItem(items, item);
    } else if (!(item.isPending && userMessagePersisted)) {
      items.push(item);
    }
  }
  return items;
};

export const toTimelineItems = ({
  events,
  pendingUserMessage,
  activeExecution,
}: ToTimelineItemsParams): TimelineItem[] =>
  assembleTimelineItems(
    buildSavedItems(events, activeExecution?.promptResponse),
    buildLiveItems({ pendingUserMessage, activeExecution })
  );
