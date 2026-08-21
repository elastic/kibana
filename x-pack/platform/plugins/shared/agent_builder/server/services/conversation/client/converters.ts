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

  // The timeline is a derived projection of the rounds, which stay the source of truth. It is
  // exposed on the conversation object but never persisted (this PR writes rounds only).
  const withEvents = (conversation: Conversation): Conversation => ({
    ...conversation,
    events: roundsToEvents(conversation),
  });

  if (existingAttachments && existingAttachments.length > 0) {
    return withEvents({
      ...base,
      rounds: roundsWithRefs,
      attachments: existingAttachments,
      ...(document._source!.state && { state: document._source!.state }),
    });
  }

  if (hasLegacyRoundAttachments) {
    return withEvents({
      ...base,
      rounds: roundsWithRefs,
      ...(attachmentsForRefs.length > 0 && { attachments: attachmentsForRefs }),
      ...(document._source!.state && { state: document._source!.state }),
    });
  }

  return withEvents({
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
    // The timeline is derived from rounds on read (see fromEs), never persisted here.
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
  const updated = {
    ...conversation,
    ...update,
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
