/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedAgentBuilderError } from '@kbn/agent-builder-common';

export interface UserPrompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface FindUserPromptsResponse {
  page: number;
  per_page: number;
  total: number;
  data: UserPrompt[];
}

export type GetUserPromptResponse = UserPrompt;

export interface CreateUserPromptPayload {
  id: string;
  name: string;
  content: string;
}

export type CreateUserPromptResponse = UserPrompt;

export interface UpdateUserPromptPayload {
  name?: string;
  content?: string;
}

export type UpdateUserPromptResponse = UserPrompt;

export interface DeleteUserPromptResponse {
  success: boolean;
}

interface BulkDeleteUserPromptResultBase {
  promptId: string;
}

interface BulkDeleteUserPromptSuccessResult extends BulkDeleteUserPromptResultBase {
  success: true;
}

interface BulkDeleteUserPromptFailureResult extends BulkDeleteUserPromptResultBase {
  success: false;
  reason: SerializedAgentBuilderError;
}

export type BulkDeleteUserPromptResult =
  | BulkDeleteUserPromptSuccessResult
  | BulkDeleteUserPromptFailureResult;

export interface BulkDeleteUserPromptsResponse {
  results: BulkDeleteUserPromptResult[];
}
