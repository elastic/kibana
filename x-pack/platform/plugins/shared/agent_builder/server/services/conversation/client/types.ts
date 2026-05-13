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
  ConversationRoundStepType,
  Conversation,
} from '@kbn/agent-builder-common/chat/conversation';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AgentNodeState } from '@kbn/agent-builder-common/chat/round_state';

export type ConversationCreateRequest = Omit<
  Conversation,
  'id' | 'created_at' | 'updated_at' | 'user'
> & {
  id?: string;
};

export type ConversationUpdateRequest = Pick<Conversation, 'id'> &
  Partial<Pick<Conversation, 'title' | 'rounds' | 'attachments' | 'state'>>;

export interface ConversationListOptions {
  agentId?: string;
}

/**
 * Mode for {@link ConversationClient.import}.
 *
 * - `create` (default): fail with 409 if a conversation with the given id already
 *   exists in the current space (regardless of owner).
 * - `overwrite`: replace an existing conversation owned by the current user.
 *   Still fails with 403 if the existing conversation is owned by another user.
 */
export type ConversationImportMode = 'create' | 'overwrite';

/**
 * A single imported round. Faithfully captures the user/assistant transcript
 * but does NOT seed agent state, tool calls, or attachments.
 */
export interface ConversationImportRound {
  user_message: string;
  assistant_message: string;
  /** ISO timestamp. Defaults to the time the import is processed. */
  started_at?: string;
}

/**
 * Payload accepted by {@link ConversationClient.import}.
 */
export interface ConversationImportRequest {
  agent_id: string;
  id?: string;
  title?: string;
  mode?: ConversationImportMode;
  rounds: ConversationImportRound[];
}

/**
 * Filter for {@link ConversationClient.bulkDelete}. At least one field must be set.
 *
 * - `conversation_ids`: explicit ids (capped at 1000). Only ids owned by the
 *   current user are deleted; others are reported as `not_found`.
 * - `agent_id` and/or `created_after`/`created_before`: deletes all conversations
 *   matching the filter, scoped to the current user.
 */
export interface ConversationBulkDeleteFilter {
  conversation_ids?: string[];
  agent_id?: string;
  created_after?: string;
  created_before?: string;
  dry_run?: boolean;
}

/**
 * Result of {@link ConversationClient.bulkDelete}.
 */
export interface ConversationBulkDeleteResult {
  /** Number of conversations actually deleted. 0 when `dry_run: true`. */
  deleted: number;
  /** Number of conversations that match the filter. */
  matched: number;
  /**
   * Ids from `conversation_ids` that could not be deleted because they do not
   * exist in the current space or are owned by another user.
   */
  not_found: string[];
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
  | BackgroundAgentCompleteStep;

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
