/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ToolCallWithResult,
  ConversationRoundStepMixin,
  ReasoningStep,
  CompactionStep,
  BackgroundAgentCompleteStep,
  TodosStep,
  AskUserQuestionStep,
  RelevantSkillsStep,
  SubagentRosterUpdatedStep,
  ConversationRoundStepType,
  Conversation,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  ConversationAccessControl,
  ConversationInternalState,
} from '@kbn/agent-builder-common/chat';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AgentNodeState } from '@kbn/agent-builder-common/chat/round_state';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import type { ConversationWithoutRoundsWithPermissions } from '../../../../common/http_api/conversations';

export type ConversationCreateRequest = Omit<
  Conversation,
  'id' | 'created_at' | 'updated_at' | 'user' | 'access_control'
> & {
  id?: string;
  /**
   * Optional user override. Used to set the parent conversation's user when creating a child conversation for a subagent
   */
  user?: UserIdAndName;
  access_control?: ConversationAccessControl;
};

export type ConversationUpdatableFields = Pick<Conversation, 'id'> &
  Partial<
    Pick<
      Conversation,
      | 'title'
      | 'rounds'
      | 'attachments'
      | 'state'
      | 'status'
      | 'read'
      | 'pinned'
      | 'workspace_id'
      | 'access_control'
      | 'metadata'
      | 'template_id'
      | 'template_version'
    >
  > & { read_by?: ConversationReadByEntry[]; pinned_by?: ConversationPinnedByEntry[] };

export type ConversationUpdateRequest = Pick<
  ConversationUpdatableFields,
  'id' | 'title' | 'attachments' | 'read' | 'metadata' | 'template_id' | 'template_version'
>;

export interface GetEventsOptions {
  /** Return only events after the one with this id (exclusive). */
  afterEventId?: string;
  /** Cap the number of events returned (applied after `afterEventId`). */
  limit?: number;
}

/**
 * Persists a single completed round as intent, not end state, so it can be merged into
 * whatever is stored. A caller-supplied `rounds` array would drop concurrent rounds.
 */
export interface UpsertRoundRequest {
  id: string;
  /** Upserted by `round.id`: appended if new, replaced in place if present (HITL resume). */
  round: ConversationRound;
  /** `action: 'regenerate'` only: id of the round this one supersedes. */
  replacesRoundId?: string;
  state?: ConversationInternalState;
  /** Reconciled into the stored list; `snapshot` is what the round started from. */
  attachments?: { snapshot: VersionedAttachment[]; produced: VersionedAttachment[] };
  /** Applied only when the stored conversation has no workspace yet. */
  workspaceId?: string;
}

/**
 * Adds attachments to the conversation and references them from the last stored
 * round. Merge semantics: the target round and the attachment list are both
 * resolved against stored state, so concurrent round or attachment writes survive.
 */
export interface AddAttachmentsToLastRoundRequest {
  id: string;
  /** Merged into the last stored round's `input.attachment_refs`. */
  refs: AttachmentVersionRef[];
  /** Reconciled into the stored list; `snapshot` is what the caller started from. */
  attachments: { snapshot: VersionedAttachment[]; produced: VersionedAttachment[] };
}

export interface ConversationListOptions {
  agentId?: string;
  page?: number;
  perPage?: number;
  sortOrder?: 'asc' | 'desc';
  pinned?: boolean;
}

export interface ConversationListResult {
  results: ConversationWithoutRoundsWithPermissions[];
  total: number;
}

/**
 * A version of ToolCallWithResult where 'results' is a serialized string.
 */
export type PersistentToolCallWithResult = Omit<ToolCallWithResult, 'results'> & {
  results: string;
};

/**
 * A version of ToolCallStep suitable for persistence.
 */
export type PersistentToolCallStep = ConversationRoundStepMixin<
  ConversationRoundStepType.toolCall,
  PersistentToolCallWithResult
>;

/**
 * A union of all possible persistent step types.
 */
export type PersistentConversationRoundStep =
  | PersistentToolCallStep
  | ReasoningStep
  | CompactionStep
  | BackgroundAgentCompleteStep
  | TodosStep
  | AskUserQuestionStep
  | RelevantSkillsStep
  | SubagentRosterUpdatedStep;

/**
 * Legacy fields that may exist in old persisted documents.
 * These are normalized to the current model shape during deserialization.
 */
interface LegacyRoundFields {
  /** @deprecated Use `pending_prompts` (array). Normalized on read. */
  pending_prompt?: PromptRequest;
}

/**
 * Legacy fields that may exist in old persisted RoundState documents.
 * Normalized to use `nodes` (array) during deserialization.
 */
export interface LegacyAgentStateFields {
  /** @deprecated Use `nodes` (array). Normalized on read. */
  node?: AgentNodeState;
}

/**
 * Represents a conversation round suitable for persistence, with tool
 * call results serialized to a string.
 */
export type PersistentConversationRound = Omit<ConversationRound, 'steps'> &
  LegacyRoundFields & {
    steps: PersistentConversationRoundStep[];
  };

/**
 * One user who has read a conversation. An entry object rather than a bare id string
 * so fields such as `read_at` can be added later without another shape migration.
 */
export interface ConversationReadByEntry {
  userId: string;
}

/**
 * One user who has pinned a conversation. An entry object rather than a bare id string
 * so fields such as `pinned_at` can be added later without another shape migration.
 */
export interface ConversationPinnedByEntry {
  userId: string;
}

/**
 * Server-internal persistence shape of a conversation, carrying the per-user
 * `read_by` and `pinned_by` lists that back the public `Conversation.read` and
 * `Conversation.pinned` booleans.
 */
export type NormalizedConversation = Conversation & {
  read_by?: ConversationReadByEntry[];
  pinned_by?: ConversationPinnedByEntry[];
};
