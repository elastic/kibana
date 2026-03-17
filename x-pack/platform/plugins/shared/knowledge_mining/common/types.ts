/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type MemoryType = 'factual' | 'procedural' | 'contextual' | 'preference';

export interface Memory {
  id: string;
  path: string;
  directory: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags: string[];
  space: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  source_conversation_ids: string[];
  version: number;
}

export type SuggestionAction = 'create' | 'update' | 'delete';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

export interface Suggestion {
  id: string;
  action: SuggestionAction;
  target_memory_id?: string;
  target_path?: string;
  proposed_title: string;
  proposed_content: string;
  proposed_path: string;
  proposed_memory_type?: MemoryType;
  proposed_tags: string[];
  reasoning?: string;
  status: SuggestionStatus;
  source_conversation_id?: string;
  source_round_summary?: string;
  space: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface MemoryCreateRequest {
  path: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags?: string[];
  source_conversation_ids?: string[];
}

export interface MemoryUpdateRequest {
  title?: string;
  content?: string;
  memory_type?: MemoryType;
  tags?: string[];
  path?: string;
}

export interface SuggestionCreateRequest {
  action: SuggestionAction;
  target_memory_id?: string;
  target_path?: string;
  proposed_title: string;
  proposed_content: string;
  proposed_path: string;
  proposed_memory_type?: MemoryType;
  proposed_tags?: string[];
  reasoning?: string;
  source_conversation_id?: string;
  source_round_summary?: string;
}

export interface MemorySearchOptions {
  query?: string;
  memory_type?: MemoryType;
  tags?: string[];
  directory?: string;
  limit?: number;
}
