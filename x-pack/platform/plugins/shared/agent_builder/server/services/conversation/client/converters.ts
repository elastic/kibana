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
  CurrentUser,
  ToolResult,
  UserIdAndName,
  SerializedMetadataValue,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolOrigin,
  ToolResultType,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ConversationPermissions } from '../../../../common/http_api/conversations';
import {
  hasConversationDeleteAccess,
  hasConversationRenameAccess,
  hasConversationUpdateAccessControlAccess,
} from '../access_control';
import type {
  ConversationCreateRequest,
  ConversationUpdatableFields,
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
import { roundsToEvents } from './rounds_to_events';

export type Document = Omit<
  Required<
    Pick<GetResponse<ConversationProperties>, '_source' | '_id' | '_seq_no' | '_primary_term'>
  >,
  '_source'
> & {
  _source: ConversationProperties;
};

export const isConversationDocument = (hit: Partial<Document>): hit is Document => {
  return (
    hit._id !== undefined &&
    hit._source !== undefined &&
    hit._seq_no !== undefined &&
    hit._primary_term !== undefined
  );
};

/**
 * Answers "does this conversation carry a stored events projection?". Monotonic
 * and future-proof: a v1 document read by future v2 code is still events-native
 * (it has a stored projection), so this is the correct read/write gate. Use
 * `CONVERSATION_SCHEMA_VERSION` directly (equality) only when the current
 * projection format matters — never as the has-events gate.
 */
export const isEventsNativeVersion = (v: number | undefined): v is number =>
  typeof v === 'number' && v >= 1;

/**
 * Discriminates the ids produced by `roundToEvents` (see rounds_to_events.ts)
 * from any additive event that lives on the timeline but has no round shape
 * (e.g. future `execution_failed` / `execution_aborted`). The reconcile step
 * uses this to regenerate round-derived events on every write while preserving
 * additive ones.
 */
const isRoundDerivedEventId = (id: string): boolean =>
  id.endsWith('::user_message') ||
  id.endsWith('::execution_started') ||
  id.endsWith('::execution_terminated');

/**
 * Rebuilds the stored `events` projection on write for an events-native
 * conversation: round-derived events come from a fresh `roundsToEvents` call
 * against the current rounds (so stale/regenerated rounds drop cleanly), and
 * any additive events already on `merged.events` are preserved (so future
 * error events aren't clobbered by a recompute).
 */
const reconcileEvents = (merged: Conversation) => {
  const roundDerived = roundsToEvents(merged);
  const additive = (merged.events ?? []).filter((event) => !isRoundDerivedEventId(event.id));
  return [...roundDerived, ...additive];
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
    status: document._source.status,
    read: document._source.read,
    pinned: document._source.pinned,
    read_only: document._source.read_only ?? false,
    access_control: normalizeConversationAccessControl(document._source.access_control),
    ...(document._source.origin ? { origin: document._source.origin } : {}),
    ...(document._source.workspace_id ? { workspace_id: document._source.workspace_id } : {}),
    ...(document._source.metadata ? { metadata: document._source.metadata } : {}),
    ...(document._source.template_id ? { template_id: document._source.template_id } : {}),
    ...(document._source.template_version !== undefined
      ? { template_version: document._source.template_version }
      : {}),
  };
};

function serializeStepResults(rounds: ConversationRound[]): PersistentConversationRound[] {
  return rounds.map<PersistentConversationRound>((round) => ({
    ...round,
    steps: round.steps.map<PersistentConversationRoundStep>((step) => {
      if (step.type === ConversationRoundStepType.toolCall) {
        return {
          ...step,
          results: JSON.stringify(step.results),
        };
      } else {
        return step;
      }
    }),
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
            results: (JSON.parse(step.results) as ToolResult[]).map((result) => {
              return migrateToolResultType({
                ...result,
                tool_result_id: result.tool_result_id ?? getToolResultId(),
              });
            }),
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

  // Migration: prefer legacy 'rounds' field, fallback to new 'conversation_rounds' field
  const rawRounds = document._source!.rounds ?? document._source!.conversation_rounds;
  const deserializedRounds = deserializeStepResults(rawRounds);

  const existingAttachments = document._source!.attachments;
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

  const storedSchemaVersion = document._source!.schema_version;
  const storedEvents = document._source!.events;
  const isEventsNative = isEventsNativeVersion(storedSchemaVersion);

  // `schema_version` must land on the domain object (not just the response),
  // because the OCC writer's `get` uses `fromEs` and `toEs` gates on it: without
  // this, every update would look legacy and never persist events.
  const withVersion = (conversation: Conversation): Conversation =>
    isEventsNative ? { ...conversation, schema_version: storedSchemaVersion } : conversation;

  // Serve stored events only when the doc is events-native AND has a non-empty
  // stored projection. The "v1 but empty/absent events" case (e.g. a rolling
  // upgrade wrote through an older node that stripped the field) falls back to
  // derive-from-rounds — a stored projection is never assumed to exist just
  // because the version says so. Legacy docs continue to derive as today.
  const withEvents = (conversation: Conversation): Conversation => ({
    ...conversation,
    events:
      isEventsNative && storedEvents && storedEvents.length > 0
        ? storedEvents
        : roundsToEvents(conversation),
  });

  const decorate = (conversation: Conversation): Conversation =>
    withEvents(withVersion(conversation));

  if (existingAttachments && existingAttachments.length > 0) {
    return decorate({
      ...base,
      rounds: roundsWithRefs,
      attachments: existingAttachments,
      ...(document._source!.state && { state: document._source!.state }),
    });
  }

  if (hasLegacyRoundAttachments) {
    return decorate({
      ...base,
      rounds: roundsWithRefs,
      ...(attachmentsForRefs.length > 0 && { attachments: attachmentsForRefs }),
      ...(document._source!.state && { state: document._source!.state }),
    });
  }

  return decorate({
    ...base,
    rounds: roundsWithRefs,
    ...(document._source!.state && { state: document._source!.state }),
  });
};

export const fromEsWithoutRounds = (document: Document): ConversationWithoutRounds => {
  return convertBaseFromEs(document);
};

export const withPermissions = <T extends ConversationWithoutRounds>({
  conversation,
  user,
}: {
  conversation: T;
  user: CurrentUser;
}): T & { permissions: ConversationPermissions } => {
  return {
    ...conversation,
    permissions: {
      rename: hasConversationRenameAccess({ conversation, user }),
      delete: hasConversationDeleteAccess({ conversation, user }),
      update_access_control: hasConversationUpdateAccessControlAccess({
        conversation,
        user,
      }),
    },
  };
};

export const toEs = (conversation: Conversation, space: string): ConversationProperties => {
  // Events-native docs persist the reconciled projection + version alongside
  // rounds in the same OCC write; legacy docs (no schema_version) stay rounds-
  // only. `updateConversation` is responsible for regenerating `events` on
  // every write, so this converter only decides whether to emit them.
  const isEventsNative = isEventsNativeVersion(conversation.schema_version);
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
    status: conversation.status,
    read: conversation.read,
    pinned: conversation.pinned,
    read_only: conversation.read_only,
    access_control: normalizeConversationAccessControl(conversation.access_control),
    ...(conversation.origin ? { origin: conversation.origin } : {}),
    ...(conversation.workspace_id ? { workspace_id: conversation.workspace_id } : {}),
    ...(isEventsNative
      ? {
          events: conversation.events ?? [],
          schema_version: conversation.schema_version,
        }
      : {}),
    // Cast metadata to storage type — the flattened mapping requires string | string[].
    // Deserialized domain values (boolean, number) only exist on read; writes always
    // go through serializeMetadataValue before reaching this converter.
    ...(conversation.metadata
      ? { metadata: conversation.metadata as Record<string, SerializedMetadataValue> }
      : {}),
    ...(conversation.template_id ? { template_id: conversation.template_id } : {}),
    ...(conversation.template_version !== undefined
      ? { template_version: conversation.template_version }
      : {}),
  };
};

export const updateConversation = ({
  conversation,
  update,
  space,
  updateDate,
}: {
  conversation: Conversation;
  update: ConversationUpdatableFields;
  space: string;
  updateDate: Date;
}) => {
  // Defensive strip of system-managed fields from the caller-supplied update.
  // `events` and `schema_version` are never accepted from a payload — they are
  // regenerated from the stored conversation below — so this keeps the write
  // path immune even if a route schema is later widened.
  const {
    events: _ignoredEvents,
    schema_version: _ignoredSchemaVersion,
    ...safeUpdate
  } = update as ConversationUpdatableFields & {
    events?: Conversation['events'];
    schema_version?: Conversation['schema_version'];
  };

  // `conversation` here comes from `fromEs`, so it already carries the stored
  // `events` (round-derived + any additive events) and `schema_version` for
  // events-native docs. We copy those from the stored conversation only,
  // never from the update payload.
  const merged: Conversation = {
    ...conversation,
    ...safeUpdate,
    space,
    updated_at: updateDate.toISOString(),
    schema_version: conversation.schema_version,
  } as Conversation;

  // Legacy conversations stay rounds-only (reconcile is skipped and `toEs`
  // omits `events`/`schema_version`), so they are never accidentally migrated.
  if (!isEventsNativeVersion(merged.schema_version)) {
    return merged;
  }

  // Events-native writes always re-stamp at the current format version so
  // older-format docs self-heal on their next write ("provenance instead of
  // migration"), and reconcile the projection: fresh round-derived events
  // replace stale ones, additive events (errors, later) are preserved.
  return {
    ...merged,
    schema_version: CONVERSATION_SCHEMA_VERSION,
    events: reconcileEvents(merged),
  };
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
  const createdAt = creationDate.toISOString();

  // `createRequestToEs` is the single promoter to events-native: it stamps
  // `schema_version` at the current format and derives `events` itself from
  // the caller's rounds rather than trusting an array off the request. That
  // gives each field exactly one writer and means `create()` needs no change.
  // `roundsToEvents` needs a `Conversation`, so build a minimal in-memory
  // shape (the ids/actors it reads all come from these fields).
  const forEvents: Conversation = {
    id: '',
    agent_id: conversation.agent_id,
    user: { id: currentUser.id, username: currentUser.username },
    title: conversation.title,
    created_at: createdAt,
    updated_at: createdAt,
    rounds: conversation.rounds,
    ...(conversation.origin ? { origin: conversation.origin } : {}),
  };
  const events = roundsToEvents(forEvents);

  return {
    agent_id: conversation.agent_id,
    user_id: currentUser.id,
    user_name: currentUser.username,
    space,
    title: conversation.title,
    created_at: createdAt,
    updated_at: createdAt,
    conversation_rounds: serializeStepResults(conversation.rounds),
    events,
    schema_version: CONVERSATION_SCHEMA_VERSION,
    attachments: conversation.attachments ?? [],
    state: conversation.state,
    status: conversation.status,
    read: false,
    pinned: false,
    read_only: conversation.read_only ?? false,
    access_control: normalizeConversationAccessControl(conversation.access_control),
    ...(conversation.origin ? { origin: conversation.origin } : {}),
    ...(conversation.workspace_id ? { workspace_id: conversation.workspace_id } : {}),
    // Cast metadata to storage type — see note in toEs.
    ...(conversation.metadata
      ? { metadata: conversation.metadata as Record<string, SerializedMetadataValue> }
      : {}),
    ...(conversation.template_id ? { template_id: conversation.template_id } : {}),
    ...(conversation.template_version !== undefined
      ? { template_version: conversation.template_version }
      : {}),
  };
};
