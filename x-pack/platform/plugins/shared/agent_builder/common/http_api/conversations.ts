/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';

export interface ListConversationsResponse {
  results: ConversationWithoutRounds[];
}

export interface DeleteConversationResponse {
  success: boolean;
}

export interface RenameConversationResponse {
  id: string;
  title: string;
}

/**
 * Single round in {@link ImportConversationRequest}.
 *
 * `started_at` defaults to the time the import is processed.
 */
export interface ImportConversationRound {
  user_message: string;
  assistant_message: string;
  started_at?: string;
}

/**
 * Body for `POST /internal/agent_builder/conversations/_import`.
 *
 * Faithfully ingests a transcript as a new conversation. No agent execution
 * happens — `steps` are empty and `model_usage` is zeroed. Use {@link mode}
 * to control idempotency for evaluation runners.
 */
export interface ImportConversationRequest {
  agent_id: string;
  id?: string;
  title?: string;
  /** Defaults to `create`. */
  mode?: 'create' | 'overwrite';
  rounds: ImportConversationRound[];
}

export interface ImportConversationResponse {
  conversation_id: string;
  round_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Body for `POST /internal/agent_builder/conversations/_bulk_delete`.
 *
 * Implicitly scoped to the current user. At least one filter field must be set.
 */
export interface BulkDeleteConversationsRequest {
  /** Explicit ids, capped at 1000. */
  conversation_ids?: string[];
  agent_id?: string;
  /** ISO timestamp. Inclusive lower bound on `created_at`. */
  created_after?: string;
  /** ISO timestamp. Inclusive upper bound on `created_at`. */
  created_before?: string;
  /** When true, returns counts but performs no deletes. */
  dry_run?: boolean;
}

export interface BulkDeleteConversationsResponse {
  deleted: number;
  matched: number;
  not_found: string[];
}
