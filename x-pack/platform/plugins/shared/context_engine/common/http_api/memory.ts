/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShortTermMemoryType } from '../memory';

export interface RememberMemoryRequest {
  /** The id of an existing memory to revise. Omit to create a new memory. */
  id?: string;
  /** Groups memories from one session. Generated and returned when omitted. */
  session_id?: string;
  type: ShortTermMemoryType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  /** Defaults to 90 days from the write, and cannot be later than that. */
  expires_at?: string;
}

export interface RememberMemoryResponse {
  id: string;
  session_id: string;
}

export interface ForgetMemoryRequest {
  id: string;
}

export interface ForgetMemoryResponse {
  id: string;
}

export interface MemoryDreamingUser {
  id?: string;
  username?: string;
}

export interface EnableMemoryDreamingRequest {
  /** When false, dreaming only runs from "Dream now". Defaults to true. */
  scheduled?: boolean;
  /**
   * Temporary, for testing: every dream deletes the space's long-term memories and rebuilds them
   * from all short-term memories. Defaults to false.
   */
  rebuild?: boolean;
}

export interface MemoryDreamingStatusResponse {
  enabled: boolean;
  /** When false, dreaming only runs from "Dream now". */
  scheduled?: boolean;
  /** Every dream rebuilds the long-term memories from all short-term memories. */
  rebuild?: boolean;
  /** A dream is running or about to start. */
  running?: boolean;
  enabled_by?: MemoryDreamingUser;
  enabled_at?: string;
  interval?: string;
  next_run_at?: string;
  last_dream_at?: string;
  last_run_at?: string;
  /** `partial` when some long-term memory types failed and the others went ahead. */
  last_run_status?: 'success' | 'partial' | 'failed';
  last_error?: string;
  /** Counts from the last run that was not a failure. */
  last_run_memories_read?: number;
  last_run_applied?: number;
  last_run_skipped?: number;
  /** Per long-term memory type, what the last run did. */
  last_run_types?: Record<string, MemoryDreamingTypeRunStatus>;
  /** The last run stopped with memories left; the next run starts within a minute. */
  catching_up?: boolean;
  /** About how many short-term memories are left while catching up. */
  pending_memories?: number;
}

export interface MemoryDreamingTypeRunStatus {
  memories_read: number;
  applied: number;
  skipped: number;
  batches: number;
  error?: string;
}
