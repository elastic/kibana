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
  ConversationParentRelation,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolOrigin,
  ToolResultType,
  isEventsNativeVersion,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import { getToolResultId } from '@kbn/agent-builder-server';
import type {
  ConversationPermissions,
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
} from '../../../../common/http_api/conversations';
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
  NormalizedConversation,
} from './types';
import type { ConversationProperties } from './storage';
import { isReadBy, migrateReadBy } from './read_by';
import { isPinnedBy, migratePinnedBy } from './pinned_by';
import type { ConversationTemplateResolver } from '../templates/serialize';
import { withDeserializedMetadata } from '../templates/serialize';
import {
  createAttachmentRefs,
  migrateRoundAttachments,
  needsMigration,
  applyAttachmentRefsToRounds,
} from './migrate_attachments';
import { isRoundDerivedEventId, roundsToEvents } from './rounds_to_events';
import { eventsToRounds } from './events_to_rounds';

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
 * Rebuilds the stored timeline on write: round events keep their order, and additive events
 * (like errors) get slotted in by timestamp. That keeps a future error where it actually
 * happened instead of dumped at the end.
 */
const reconcileEvents = (merged: Conversation) => {
  const roundDerived = roundsToEvents(merged);
  const additive = (merged.events ?? []).filter((event) => !isRoundDerivedEventId(event.id));

  const events = [...roundDerived];
  for (const event of additive) {
    const insertAt = events.findIndex((existing) => existing.created_at > event.created_at);
    if (insertAt === -1) {
      events.push(event);
    } else {
      events.splice(insertAt, 0, event);
    }
  }
  return events;
};

export const fromEsWithoutRounds = (
  document: Document,
  user: CurrentUser
): ConversationWithoutRounds => {
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
    read: isReadBy({ source: document._source, user }),
    pinned: isPinnedBy({ source: document._source, user }),
    read_only: document._source.read_only ?? false,
    access_control: normalizeConversationAccessControl(document._source.access_control),
    ...(document._source.origin ? { origin: document._source.origin } : {}),
    ...(document._source.workspace_id ? { workspace_id: document._source.workspace_id } : {}),
    ...(document._source.parent_conversation
      ? {
          parent_conversation: {
            id: document._source.parent_conversation.id,
            relation: document._source.parent_conversation.relation as ConversationParentRelation,
          },
        }
      : {}),
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

export const fromEs = (document: Document, user: CurrentUser): NormalizedConversation => {
  const base = fromEsWithoutRounds(document, user);
  const perUserFlags = {
    read_by: migrateReadBy(document._source),
    pinned_by: migratePinnedBy(document._source),
  };

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

  const conversation: NormalizedConversation = {
    ...base,
    ...perUserFlags,
    rounds: roundsWithRefs,
    ...(attachmentsForRefs.length > 0 ? { attachments: attachmentsForRefs } : {}),
    ...(document._source!.state ? { state: document._source!.state } : {}),
    ...(isEventsNative ? { schema_version: storedSchemaVersion } : {}),
  };

  const events =
    isEventsNative && storedEvents && storedEvents.length > 0
      ? storedEvents
      : roundsToEvents(conversation);

  return { ...conversation, events };
};

const withPermissions = <T extends ConversationWithoutRounds>({
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

/**
 * Read-path round-trip verification. When on, a conversation's rounds are replaced by
 * `eventsToRounds(roundsToEvents(...))` so every test suite that reads a conversation asserts the
 * rounds<->events conversion is an identity — a fidelity regression fails CI. Applied at the
 * response boundary only (never `fromEs`, which also feeds the OCC write path), so writes always
 * persist the real rounds.
 *
 * On automatically in CI (every suite that reads a conversation exercises it), and opt-in locally
 * via `CI=true`. Always OFF in production: a deployed Kibana never sets
 * `CI`, so real reads return the stored rounds untouched.
 */
const shouldVerifyRoundTrip = process.env.CI === 'true';

const verifyRoundTrip = (conversation: Conversation): Conversation =>
  shouldVerifyRoundTrip
    ? {
        ...conversation,
        rounds: eventsToRounds(roundsToEvents(conversation)),
      }
    : conversation;

const stripInternalFields = (conversation: NormalizedConversation): Conversation => {
  const {
    read_by: _readBy,
    pinned_by: _pinnedBy,
    ...conversationWithoutInternalFields
  } = conversation;

  return conversationWithoutInternalFields;
};

export const toConversationResponse = ({
  conversation,
  resolveTemplate,
}: {
  conversation: NormalizedConversation;
  resolveTemplate: ConversationTemplateResolver;
}): Conversation => withDeserializedMetadata(stripInternalFields(conversation), resolveTemplate);

export const toConversationResponseFromDocument = ({
  document,
  user,
  resolveTemplate,
}: {
  document: Document;
  user: CurrentUser;
  resolveTemplate: ConversationTemplateResolver;
}): Conversation =>
  withDeserializedMetadata(
    verifyRoundTrip(stripInternalFields(fromEs(document, user))),
    resolveTemplate
  );

export const toResponseConversation = ({
  document,
  user,
  resolveTemplate,
}: {
  document: Document;
  user: CurrentUser;
  resolveTemplate: ConversationTemplateResolver;
}): ConversationWithPermissions => {
  const conversation = toConversationResponseFromDocument({ document, user, resolveTemplate });

  return withPermissions({ conversation, user });
};

export const toResponseConversationWithoutRounds = ({
  document,
  user,
  resolveTemplate,
}: {
  document: Document;
  user: CurrentUser;
  resolveTemplate: ConversationTemplateResolver;
}): ConversationWithoutRoundsWithPermissions => {
  const conversation = withDeserializedMetadata(
    fromEsWithoutRounds(document, user),
    resolveTemplate
  );

  return withPermissions({ conversation, user });
};

export const toEs = (
  conversation: NormalizedConversation,
  space: string
): ConversationProperties => {
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
    // Explicitly omit read to ensure migration
    read: undefined,
    read_by: conversation.read_by ?? [],
    // Explicitly omit pinned to ensure migration
    pinned: undefined,
    pinned_by: conversation.pinned_by ?? [],
    read_only: conversation.read_only,
    access_control: normalizeConversationAccessControl(conversation.access_control),
    ...(conversation.origin ? { origin: conversation.origin } : {}),
    ...(conversation.workspace_id ? { workspace_id: conversation.workspace_id } : {}),
    ...(conversation.parent_conversation
      ? { parent_conversation: conversation.parent_conversation }
      : {}),
    // Only events-native conversations persist their timeline; legacy ones keep deriving it
    // from rounds on read (see fromEs).
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
  conversation: NormalizedConversation;
  update: ConversationUpdatableFields;
  space: string;
  updateDate: Date;
}) => {
  const {
    events: _ignoredEvents,
    schema_version: _ignoredSchemaVersion,
    ...safeUpdate
  } = update as ConversationUpdatableFields & {
    events?: Conversation['events'];
    schema_version?: Conversation['schema_version'];
  };

  const merged: Conversation = {
    ...conversation,
    ...safeUpdate,
    space,
    updated_at: updateDate.toISOString(),
    schema_version: conversation.schema_version,
  } as Conversation;

  if (!isEventsNativeVersion(merged.schema_version)) {
    return merged;
  }

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
  // Honor conversation.user override if provided (used for persistent sub-agent
  // creations where ownership is snapshotted from the parent conversation).
  const effectiveUser = conversation.user ?? currentUser;
  const createdAt = creationDate.toISOString();

  // The initial timeline is derived from the rounds being created, using the same user that
  // gets persisted so `user_message` actors match the stored ownership.
  const forEvents: Conversation = {
    id: '',
    agent_id: conversation.agent_id,
    user: { id: effectiveUser.id, username: effectiveUser.username },
    title: conversation.title,
    created_at: createdAt,
    updated_at: createdAt,
    rounds: conversation.rounds,
    ...(conversation.origin ? { origin: conversation.origin } : {}),
  };
  const events = roundsToEvents(forEvents);

  return {
    agent_id: conversation.agent_id,
    user_id: effectiveUser.id,
    user_name: effectiveUser.username,
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
    read_by: [],
    pinned_by: [],
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
    ...(conversation.parent_conversation
      ? { parent_conversation: conversation.parent_conversation }
      : {}),
  };
};
