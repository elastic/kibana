/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  Conversation,
  ConversationRound,
  ConversationRoundStep,
  ConversationWithoutRounds,
  ToolResult,
  UserIdAndName,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  ToolOrigin,
  ToolResultType,
  isAgentExecutionEvent,
  isUserActionEvent,
  isUserMessageEvent,
  mergeLegacyRoundsWithPersistedEvents,
  mergeTimelineEventsById,
  sortTimelineEventsChronologically,
  timelineEventsToRounds,
} from '@kbn/agent-builder-common';
import type { TimelineEvent } from '@kbn/agent-builder-common';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import { getToolResultId } from '@kbn/agent-builder-server';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  LegacyAgentStateFields,
  PersistentConversationRound,
  PersistentConversationRoundStep,
} from './types';
import type { ConversationProperties } from './storage';
import {
  createAttachmentRefs,
  migrateRoundAttachments,
  needsMigration,
  applyAttachmentRefsToRounds,
} from './migrate_attachments';
import { resolveChatMode, resolveTemplateSnapshotOnCreate } from './conversation_access';

export type Document = Pick<
  GetResponse<ConversationProperties>,
  '_source' | '_id' | '_seq_no' | '_primary_term'
>;

const convertMetadataFromEs = (source: ConversationProperties) => {
  const chatMode = resolveChatMode(source);

  return {
    ...(source.template_id !== undefined && { template_id: source.template_id }),
    ...(source.template_snapshot !== undefined && {
      template_snapshot: source.template_snapshot,
    }),
    ...(chatMode !== undefined && { chat_mode: chatMode }),
    ...(source.custom_fields !== undefined && { custom_fields: source.custom_fields }),
  };
};

const convertMetadataToEs = (conversation: Conversation): Partial<ConversationProperties> => {
  const chatMode = conversation.template_snapshot?.chat_mode;

  return {
    ...(conversation.template_id !== undefined && { template_id: conversation.template_id }),
    ...(conversation.template_snapshot !== undefined && {
      template_snapshot: conversation.template_snapshot,
    }),
    ...(chatMode !== undefined && { chat_mode: chatMode }),
    ...(conversation.custom_fields !== undefined && { custom_fields: conversation.custom_fields }),
  };
};

const isTimelineEvent = (value: unknown): value is TimelineEvent => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as TimelineEvent;
  return (
    isUserMessageEvent(candidate) ||
    isAgentExecutionEvent(candidate) ||
    isUserActionEvent(candidate)
  );
};

/**
 * ES may return `events` as an array or, with object mapping, as a map keyed by index.
 * A single stored event can also come back as a bare object. Normalize to a sorted array.
 */
export const normalizeEventsFromEs = (events: unknown): TimelineEvent[] => {
  if (events == null) {
    return [];
  }

  if (Array.isArray(events)) {
    return sortTimelineEventsChronologically(events.filter(isTimelineEvent));
  }

  if (typeof events === 'object') {
    if (isTimelineEvent(events)) {
      return [events as TimelineEvent];
    }

    const normalized = Object.entries(events as Record<string, unknown>)
      .filter(([, value]) => isTimelineEvent(value))
      .sort(([leftKey], [rightKey]) => {
        const leftIndex = Number(leftKey);
        const rightIndex = Number(rightKey);
        if (!Number.isNaN(leftIndex) && !Number.isNaN(rightIndex)) {
          return leftIndex - rightIndex;
        }
        return leftKey.localeCompare(rightKey);
      })
      .map(([, value]) => value as TimelineEvent);

    return sortTimelineEventsChronologically(normalized);
  }

  return [];
};

/** Store events keyed by id so ES object mapping does not collapse array elements. */
export const timelineEventsToEsRecord = (
  events: TimelineEvent[]
): Record<string, TimelineEvent> => {
  return Object.fromEntries(events.map((event) => [event.id, event]));
};

export { mergeTimelineEventsById };

const convertCollaborationFromEs = (source: ConversationProperties) => {
  const events = normalizeEventsFromEs(source.events);

  return {
    ...(source.conversation_mode !== undefined && { conversation_mode: source.conversation_mode }),
    ...(events.length > 0 && { events }),
  };
};

const convertCollaborationToEs = (conversation: Conversation): Partial<ConversationProperties> => {
  return {
    ...(conversation.conversation_mode !== undefined && {
      conversation_mode: conversation.conversation_mode,
    }),
    ...(conversation.events !== undefined &&
      conversation.events.length > 0 && {
        events: timelineEventsToEsRecord(normalizeTimelineEventsForEs(conversation.events)),
      }),
  };
};

const convertBaseFromEs = (document: Document) => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  return {
    id: document._id,
    agent_id: document._source.agent_id,
    user: {
      id: document._source.user_id,
      username: document._source.user_name,
    },
    title: document._source.title,
    created_at: document._source.created_at,
    updated_at: document._source.updated_at,
    ...convertMetadataFromEs(document._source),
    ...convertCollaborationFromEs(document._source),
    status: document._source.status,
    read: document._source.read,
  };
};

export const serializeRoundSteps = (
  steps: ConversationRoundStep[]
): PersistentConversationRoundStep[] => {
  return steps.map<PersistentConversationRoundStep>((step) => {
    if (step.type === ConversationRoundStepType.toolCall) {
      return {
        ...step,
        results: JSON.stringify(step.results),
      };
    }
    return step;
  });
};

function serializeStepResults(rounds: ConversationRound[]): PersistentConversationRound[] {
  return rounds.map<PersistentConversationRound>((round) => ({
    ...round,
    steps: serializeRoundSteps(round.steps),
  }));
}

/**
 * Migrates legacy tool result types to their current names.
 * This handles backward compatibility when tool result types are renamed.
 */
const migrateToolResultType = (result: ToolResult): ToolResult => {
  // Migration: 'tabular_data' was renamed to 'esql_results'
  if (result.type === 'tabular_data') {
    return {
      ...result,
      type: ToolResultType.esqlResults,
    };
  }
  return result;
};

/** Tool results in `conversation_rounds` are JSON strings; timeline `events` may store arrays. */
const deserializeToolResults = (results: string | ToolResult[]): ToolResult[] => {
  const parsed: ToolResult[] = typeof results === 'string' ? JSON.parse(results) : results;
  return parsed.map((result) =>
    migrateToolResultType({
      ...result,
      tool_result_id: result.tool_result_id ?? getToolResultId(),
    })
  );
};

/**
 * Timeline `events` must store tool `results` as objects/arrays for ES dynamic mapping.
 * Only `conversation_rounds` JSON-stringifies results (legacy storage).
 */
export const normalizeTimelineEventsForEs = (events: TimelineEvent[]): TimelineEvent[] => {
  return events.map((event) => {
    if (event.type !== TimelineEventType.agentExecution) {
      return event;
    }

    return {
      ...event,
      steps: event.steps.map((step) => {
        if (step.type !== ConversationRoundStepType.toolCall) {
          return step;
        }

        const { results } = step;
        if (typeof results === 'string') {
          return {
            ...step,
            results: deserializeToolResults(results),
          };
        }

        return step;
      }),
    };
  });
};

function deserializeStepResults(rounds: PersistentConversationRound[]): ConversationRound[] {
  return rounds.map<ConversationRound>((round) => {
    // Migration: pending_prompt (singular) -> pending_prompts (array)
    const { pending_prompt: legacyPendingPrompt, ...roundWithoutLegacy } = round;
    const pendingPrompts =
      round.pending_prompts ?? (legacyPendingPrompt ? [legacyPendingPrompt] : undefined);

    return {
      ...roundWithoutLegacy,
      pending_prompts: pendingPrompts,
      state: round.state ? migrateRoundState(round.state) : undefined,
      status: round.status ?? ConversationRoundStatus.completed,
      started_at: round.started_at ?? new Date(0).toISOString(),
      time_to_first_token: round.time_to_first_token ?? 0,
      time_to_last_token: round.time_to_last_token ?? 0,
      model_usage: round.model_usage ?? {
        llm_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
      },
      steps: round.steps.map<ConversationRoundStep>((step) => {
        if (step.type === ConversationRoundStepType.toolCall) {
          return {
            ...step,
            results: deserializeToolResults(
              step.results as string | ToolResult[]
            ),
            progression: step.progression ?? [],
            tool_origin: step.tool_origin ?? inferToolOrigin(step.tool_id),
          };
        } else {
          return step;
        }
      }),
    };
  });
}

/**
 * Migrates legacy RoundState format.
 * v1 stored a single `node`; current format uses `nodes` (array).
 */
function migrateRoundState(state: RoundState & { agent: LegacyAgentStateFields }): RoundState {
  const { agent } = state;
  if (agent.nodes) {
    return state;
  }
  if (agent.node) {
    const { node, ...agentWithoutLegacy } = agent;
    return {
      ...state,
      agent: {
        ...agentWithoutLegacy,
        nodes: [node],
      },
    };
  }
  return state;
}

const inferToolOrigin = (toolId: string): ToolOrigin | undefined => {
  // Legacy rounds do not reliably differentiate registry vs inline tools.
  // Only infer internal tools; leave others undefined for UI-side fallback.
  if (isInternalTool(toolId)) {
    return ToolOrigin.internal;
  }
  return undefined;
};

export const fromEs = (document: Document): Conversation => {
  const base = convertBaseFromEs(document);
  const collaboration = convertCollaborationFromEs(document._source!);
  const rawRounds = document._source!.rounds ?? document._source!.conversation_rounds ?? [];
  const persistedEvents = normalizeEventsFromEs(document._source!.events);
  const legacyRounds = deserializeStepResults(rawRounds);

  if (persistedEvents.length > 0) {
    const mergedEvents = mergeLegacyRoundsWithPersistedEvents({
      legacyRounds,
      persistedEvents,
      user: base.user,
      agentId: base.agent_id,
    });
    const deserializedRounds = deserializeStepResults(timelineEventsToRounds(mergedEvents));
    return buildConversationFromRounds({
      base,
      deserializedRounds,
      source: document._source!,
      collaboration: {
        ...collaboration,
        events: mergedEvents,
      },
    });
  }

  return buildConversationFromRounds({
    base,
    deserializedRounds: legacyRounds,
    source: document._source!,
    collaboration,
  });
};

const buildConversationFromRounds = ({
  base,
  deserializedRounds,
  source,
  collaboration,
}: {
  base: ReturnType<typeof convertBaseFromEs>;
  deserializedRounds: ConversationRound[];
  source: ConversationProperties;
  collaboration: ReturnType<typeof convertCollaborationFromEs>;
}) => {
  const existingAttachments = source.attachments;
  const hasLegacyRoundAttachments = needsMigration(false, deserializedRounds);
  const attachmentsForRefs =
    existingAttachments && existingAttachments.length > 0
      ? existingAttachments
      : hasLegacyRoundAttachments
      ? migrateRoundAttachments(deserializedRounds)
      : [];

  const refsByRound =
    attachmentsForRefs.length > 0
      ? createAttachmentRefs(deserializedRounds, attachmentsForRefs)
      : new Map<number, AttachmentVersionRef[]>();

  const roundsWithRefs = applyAttachmentRefsToRounds(deserializedRounds, refsByRound);

  if (existingAttachments && existingAttachments.length > 0) {
    return {
      ...base,
      ...collaboration,
      rounds: roundsWithRefs,
      attachments: existingAttachments,
      ...(source.state && { state: source.state }),
    };
  }

  if (hasLegacyRoundAttachments) {
    return {
      ...base,
      ...collaboration,
      rounds: roundsWithRefs,
      ...(attachmentsForRefs.length > 0 && { attachments: attachmentsForRefs }),
      ...(source.state && { state: source.state }),
    };
  }

  return {
    ...base,
    ...collaboration,
    rounds: roundsWithRefs,
    ...(source.state && { state: source.state }),
  };
};

export const fromEsWithoutRounds = (document: Document): ConversationWithoutRounds => {
  return convertBaseFromEs(document);
};

export const toEs = (conversation: Conversation, space: string): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: conversation.user.id,
    user_name: conversation.user.username,
    space,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    // Explicitly omit rounds to ensure migration
    rounds: undefined,
    conversation_rounds: serializeStepResults(conversation.rounds),
    attachments: conversation.attachments ?? [],
    state: conversation.state,
    ...convertMetadataToEs(conversation),
    ...convertCollaborationToEs(conversation),
    status: conversation.status,
    read: conversation.read,
  };
};

export const updateConversation = ({
  conversation,
  update,
  space,
  updateDate,
}: {
  conversation: Conversation;
  update: ConversationUpdateRequest;
  space: string;
  updateDate: Date;
}) => {
  let templateSnapshot = conversation.template_snapshot;

  if (update.template_id !== undefined) {
    const resolvedSnapshot = resolveTemplateSnapshotOnCreate({
      conversation: {
        template_id: update.template_id,
        ...(update.template_id === conversation.template_id && conversation.template_snapshot
          ? { template_snapshot: conversation.template_snapshot }
          : {}),
      },
      creationDate: updateDate,
    });
    if (resolvedSnapshot !== undefined) {
      templateSnapshot = resolvedSnapshot;
    }
  }

  const updated = {
    ...conversation,
    ...update,
    ...(templateSnapshot !== undefined && { template_snapshot: templateSnapshot }),
    space,
    updated_at: updateDate.toISOString(),
  };

  return updated;
};

export const createRequestToEs = ({
  conversation,
  space,
  currentUser,
  creationDate,
}: {
  conversation: ConversationCreateRequest;
  currentUser: UserIdAndName;
  creationDate: Date;
  space: string;
}): ConversationProperties => {
  const templateSnapshot = resolveTemplateSnapshotOnCreate({
    conversation,
    creationDate,
  });
  const conversationWithSnapshot = {
    ...conversation,
    ...(templateSnapshot !== undefined && { template_snapshot: templateSnapshot }),
  };

  return {
    agent_id: conversation.agent_id,
    user_id: currentUser.id,
    user_name: currentUser.username,
    space,
    title: conversation.title,
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
    conversation_rounds: serializeStepResults(conversation.rounds),
    attachments: conversation.attachments ?? [],
    state: conversation.state,
    ...convertMetadataToEs(conversationWithSnapshot as Conversation),
    ...convertCollaborationToEs(conversationWithSnapshot as Conversation),
    status: conversation.status,
    read: false,
  };
};
