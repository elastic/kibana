/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Short-term memory types. They match the long-term memory KI types, so promotion keeps the type. */
export const SHORT_TERM_MEMORY_TYPES = ['memory.session', 'memory.session_fact'] as const;
export type ShortTermMemoryType = (typeof SHORT_TERM_MEMORY_TYPES)[number];

export const SHORT_TERM_MEMORY_PROMOTION_STATUSES = ['pending', 'promoted', 'rejected'] as const;
export type ShortTermMemoryPromotionStatus = (typeof SHORT_TERM_MEMORY_PROMOTION_STATUSES)[number];

/** Field limits for short-term memory. They match the KI field limits, so a promoted memory always fits. */
export const SHORT_TERM_MEMORY_LIMITS = {
  idLength: 512,
  titleLength: 512,
  descriptionLength: 2048,
  contentLength: 65536,
  tagLength: 256,
  tags: 100,
  reasonLength: 2048,
} as const;

/** Short-term memory expires this long after its last write unless the writer chooses otherwise. */
export const DEFAULT_SHORT_TERM_MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ShortTermMemoryPromotion {
  status: ShortTermMemoryPromotionStatus;
  /** The AI index the memory was promoted into, when promoted. */
  ai_index_id?: string;
  /** The long-term memory KI the memory became, when promoted. */
  ki_id?: string;
  /** Why the promotion automation decided as it did. */
  reason?: string;
  updated_at?: string;
}

/** A short-term memory, private to one user and one agent. */
export interface ShortTermMemory {
  id: string;
  type: ShortTermMemoryType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  /** Stable user id of the owner (profile uid, or the realm-qualified fallback). */
  user_id: string;
  user_name: string;
  agent_id: string;
  /** The conversation the memory was recorded in, or an MCP session id. */
  session_id: string;
  space: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  /** When the memory was last recalled or shown to the agent. Recorded at most hourly. */
  last_used_at?: string;
  promotion: ShortTermMemoryPromotion;
}
