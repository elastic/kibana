/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  ShortTermMemory,
  ShortTermMemoryPromotion,
  ShortTermMemoryPromotionStatus,
  ShortTermMemoryType,
} from '@kbn/agent-builder-common';

/** Short-term memories are KIs of these types in the Elastic AI index. */
export const SHORT_TERM_MEMORY_KI_TYPE_PREFIX = 'memory.short_term.';

/**
 * Stamped on every short-term memory and granted by no feature, so the Elastic AI index's implicit
 * document-level security and the SML visibility filter hide it from everyone but superusers and
 * roles with an explicit grant on the index. Agent Builder reads it as the internal user and
 * filters on the owner itself.
 */
export const SHORT_TERM_MEMORY_ACCESS_ACTION = 'ai_index:short_term_memory/read';

/** Owner, agent, session and promotion live in the flattened `attributes`, the strict mapping's only open field. */
export const MEMORY_ATTRIBUTES = {
  userId: 'memory.user_id',
  userName: 'memory.user_name',
  agentId: 'memory.agent_id',
  sessionId: 'memory.session_id',
  space: 'memory.space',
  lastUsedAt: 'memory.last_used_at',
  promotionStatus: 'memory.promotion.status',
  promotionReason: 'memory.promotion.reason',
  promotionAiIndexId: 'memory.promotion.ai_index_id',
  promotionKiId: 'memory.promotion.ki_id',
  promotionUpdatedAt: 'memory.promotion.updated_at',
} as const;

export const attributeField = (key: string): string => `attributes.${key}`;

/** A short-term memory as stored in the Elastic AI index (base KI mapping plus `permissions`). */
export interface ShortTermMemoryKiDocument {
  '@timestamp': string;
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  updated_at: string;
  expires_at?: string;
  references: Array<{ uri: string; relation: string }>;
  attributes: Record<string, string>;
  governance: {
    provenance: {
      created_by: { uri: string; metadata: Record<string, string> };
      updated_by: { uri: string; metadata: Record<string, string> };
    };
  };
  permissions: { kibana: { privileges: Array<{ space: string; name: string[]; count: number }> } };
}

export const toKiType = (type: ShortTermMemoryType): string =>
  `${SHORT_TERM_MEMORY_KI_TYPE_PREFIX}${type.slice('memory.'.length)}`;

const fromKiType = (kiType: string): ShortTermMemoryType =>
  kiType === `${SHORT_TERM_MEMORY_KI_TYPE_PREFIX}session`
    ? 'memory.session'
    : 'memory.session_fact';

export const promotionAttributes = (
  promotion: Omit<ShortTermMemoryPromotion, 'updated_at'> & { updated_at?: string }
): Record<string, string> => ({
  [MEMORY_ATTRIBUTES.promotionStatus]: promotion.status,
  ...(promotion.reason !== undefined && { [MEMORY_ATTRIBUTES.promotionReason]: promotion.reason }),
  ...(promotion.ai_index_id !== undefined && {
    [MEMORY_ATTRIBUTES.promotionAiIndexId]: promotion.ai_index_id,
  }),
  ...(promotion.ki_id !== undefined && { [MEMORY_ATTRIBUTES.promotionKiId]: promotion.ki_id }),
  ...(promotion.updated_at !== undefined && {
    [MEMORY_ATTRIBUTES.promotionUpdatedAt]: promotion.updated_at,
  }),
});

/** Drops the promotion attributes, so a revised memory is decided afresh. */
export const withoutPromotion = (attributes: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(attributes).filter(([key]) => !key.startsWith('memory.promotion.'))
  );

export const toShortTermMemory = (doc: ShortTermMemoryKiDocument): ShortTermMemory => {
  const { attributes } = doc;
  const reason = attributes[MEMORY_ATTRIBUTES.promotionReason];
  const aiIndexId = attributes[MEMORY_ATTRIBUTES.promotionAiIndexId];
  const kiId = attributes[MEMORY_ATTRIBUTES.promotionKiId];
  const promotionUpdatedAt = attributes[MEMORY_ATTRIBUTES.promotionUpdatedAt];
  const lastUsedAt = attributes[MEMORY_ATTRIBUTES.lastUsedAt];
  return {
    id: doc.id,
    type: fromKiType(doc.type),
    title: doc.title,
    description: doc.description,
    content: doc.content,
    tags: doc.tags ?? [],
    user_id: attributes[MEMORY_ATTRIBUTES.userId],
    user_name: attributes[MEMORY_ATTRIBUTES.userName],
    agent_id: attributes[MEMORY_ATTRIBUTES.agentId],
    session_id: attributes[MEMORY_ATTRIBUTES.sessionId],
    space: attributes[MEMORY_ATTRIBUTES.space],
    created_at: doc['@timestamp'],
    updated_at: doc.updated_at,
    ...(doc.expires_at !== undefined && { expires_at: doc.expires_at }),
    ...(lastUsedAt !== undefined && { last_used_at: lastUsedAt }),
    promotion: {
      status: (attributes[MEMORY_ATTRIBUTES.promotionStatus] ??
        'pending') as ShortTermMemoryPromotionStatus,
      ...(reason !== undefined && { reason }),
      ...(aiIndexId !== undefined && { ai_index_id: aiIndexId }),
      ...(kiId !== undefined && { ki_id: kiId }),
      ...(promotionUpdatedAt !== undefined && { updated_at: promotionUpdatedAt }),
    },
  };
};

export const shortTermMemoryTypeFilter: QueryDslQueryContainer = {
  prefix: { type: SHORT_TERM_MEMORY_KI_TYPE_PREFIX },
};

export const spaceFilter = (space: string): QueryDslQueryContainer => ({
  term: { [attributeField(MEMORY_ATTRIBUTES.space)]: space },
});

export const ownerFilter = (userId: string): QueryDslQueryContainer => ({
  term: { [attributeField(MEMORY_ATTRIBUTES.userId)]: userId },
});

export const agentFilter = (agentId: string): QueryDslQueryContainer => ({
  term: { [attributeField(MEMORY_ATTRIBUTES.agentId)]: agentId },
});

export const agentsFilter = (agentIds: string[] | undefined): QueryDslQueryContainer[] =>
  agentIds !== undefined && agentIds.length > 0
    ? [{ terms: { [attributeField(MEMORY_ATTRIBUTES.agentId)]: agentIds } }]
    : [];

export const notExpiredFilter = (now: Date): QueryDslQueryContainer => ({
  bool: {
    should: [
      { bool: { must_not: { exists: { field: 'expires_at' } } } },
      { range: { expires_at: { gt: now.toISOString() } } },
    ],
    minimum_should_match: 1,
  },
});
