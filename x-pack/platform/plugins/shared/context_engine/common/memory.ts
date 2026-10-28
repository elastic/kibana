/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SHORT_TERM_MEMORY_TYPES = ['memory.session', 'memory.session_fact'] as const;
export type ShortTermMemoryType = (typeof SHORT_TERM_MEMORY_TYPES)[number];

export const LONG_TERM_MEMORY_TYPES = [
  'memory.fact',
  'memory.entity',
  'memory.procedure',
  'memory.relationship',
] as const;
export type LongTermMemoryType = (typeof LONG_TERM_MEMORY_TYPES)[number];

export const MEMORY_KI_TYPES = [...SHORT_TERM_MEMORY_TYPES, ...LONG_TERM_MEMORY_TYPES] as const;

/** Long-term memory types recall searches; relationships come back as links between them. */
export const RECALL_MEMORY_TYPES = ['memory.fact', 'memory.entity', 'memory.procedure'] as const;
export type RecallMemoryType = (typeof RECALL_MEMORY_TYPES)[number];
export const DEFAULT_RECALL_SIZE = 10;
export const MAX_RECALL_SIZE = 25;
export const MAX_RECALL_QUERY_LENGTH = 1000;

/** Managed AI index holding every space's short-term memories. */
export const SHORT_TERM_MEMORY_AI_INDEX_ID = 'short-term-memory';
export const SHORT_TERM_MEMORY_DATA_STREAM = '.ai-index-ds-short-term-memory';

/** Managed AI index holding every space's long-term memories, written by dreaming. */
export const LONG_TERM_MEMORY_AI_INDEX_ID = 'long-term-memory';
export const LONG_TERM_MEMORY_INDEX = '.ai-index-idx-long-term-memory';

export const MEMORY_AI_INDEX_IDS = [
  SHORT_TERM_MEMORY_AI_INDEX_ID,
  LONG_TERM_MEMORY_AI_INDEX_ID,
] as const;

/** Default and maximum expiry of a short-term memory. Matches the data stream retention. */
export const MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS = 90;
export const MAX_SHORT_TERM_MEMORY_EXPIRATION_MS =
  MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

/** Fields that would be mapped by the memory template, kept in the flattened `attributes` for now. */
export const MEMORY_ATTRIBUTES = {
  sessionId: 'memory.session_id',
  key: 'memory.key',
  firstSeenAt: 'memory.first_seen_at',
  lastSeenAt: 'memory.last_seen_at',
  factVerificationStatus: 'fact.verification.status',
  factVerificationUpdatedAt: 'fact.verification.updated_at',
  factVerificationBy: 'fact.verification.by',
  procedureVerificationStatus: 'procedure.verification.status',
  procedureVerificationUpdatedAt: 'procedure.verification.updated_at',
  procedureVerificationBy: 'procedure.verification.by',
  entityKind: 'entity.kind',
  entityAliases: 'entity.aliases',
  relationshipRelation: 'relationship.relation',
} as const;

export const FACT_VERIFICATION_STATUSES = ['unverified', 'confirmed', 'refuted'] as const;
export type FactVerificationStatus = (typeof FACT_VERIFICATION_STATUSES)[number];

export const ENTITY_KINDS = [
  'person',
  'team',
  'system',
  'service',
  'project',
  'data',
  'other',
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const MEMORY_DREAMING_TASK_TYPE = 'contextEngine:memoryDreaming';
export const getMemoryDreamingTaskId = (spaceId: string): string =>
  `${MEMORY_DREAMING_TASK_TYPE}:${spaceId}`;
export const MEMORY_DREAMING_WRITER_URI = `task://${MEMORY_DREAMING_TASK_TYPE}`;

export const DEFAULT_MEMORY_DREAMING_INTERVAL = '24h';
export const MIN_MEMORY_DREAMING_INTERVAL_MINUTES = 60;

/** Parent inference feature that groups Context Engine models in the model settings. */
export const CONTEXT_ENGINE_INFERENCE_FEATURE_ID = 'context_engine';

/** Inference feature used to pick the dreaming model. */
export const CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID = 'context_engine_memory';

export const CONTEXT_ENGINE_MEMORY_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion',
  '.openai-gpt-5.6-sol-chat_completion',
];
