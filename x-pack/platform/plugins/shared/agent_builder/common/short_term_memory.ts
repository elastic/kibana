/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ShortTermMemory,
  ShortTermMemoryPromotion,
  ShortTermMemoryPromotionStatus,
  ShortTermMemoryType,
} from '@kbn/agent-builder-common';

/** Short-term memories are KIs of these types in the Elastic AI index. */
export const SHORT_TERM_MEMORY_KI_TYPE_PREFIX = 'memory.short_term.';

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

/** The stored fields a short-term memory is read from, whether from a search hit or an ES|QL row. */
export interface ShortTermMemoryFields {
  '@timestamp': string;
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  updated_at: string;
  expires_at?: string;
  attributes: Record<string, string>;
}

const DECISIONS_PREFIX = 'memory.decisions.';

export const fromKiType = (kiType: string): ShortTermMemoryType =>
  kiType === `${SHORT_TERM_MEMORY_KI_TYPE_PREFIX}session`
    ? 'memory.session'
    : 'memory.session_fact';

const readDecisions = (
  attributes: Record<string, string>
): Record<string, ShortTermMemoryPromotion> => {
  const decisions: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!key.startsWith(DECISIONS_PREFIX)) {
      continue;
    }
    const rest = key.slice(DECISIONS_PREFIX.length);
    const separator = rest.lastIndexOf('.');
    if (separator > 0) {
      const decider = rest.slice(0, separator);
      decisions[decider] = { ...decisions[decider], [rest.slice(separator + 1)]: value };
    }
  }
  return Object.fromEntries(
    Object.entries(decisions).flatMap(
      ([decider, { status, reason, ai_index_id, ki_id, updated_at }]) =>
        status === undefined
          ? []
          : [
              [
                decider,
                {
                  status: status as ShortTermMemoryPromotionStatus,
                  ...(reason !== undefined && { reason }),
                  ...(ai_index_id !== undefined && { ai_index_id }),
                  ...(ki_id !== undefined && { ki_id }),
                  ...(updated_at !== undefined && { updated_at }),
                },
              ],
            ]
    )
  );
};

export const toShortTermMemory = (doc: ShortTermMemoryFields): ShortTermMemory => {
  const { attributes } = doc;
  const reason = attributes[MEMORY_ATTRIBUTES.promotionReason];
  const aiIndexId = attributes[MEMORY_ATTRIBUTES.promotionAiIndexId];
  const kiId = attributes[MEMORY_ATTRIBUTES.promotionKiId];
  const promotionUpdatedAt = attributes[MEMORY_ATTRIBUTES.promotionUpdatedAt];
  const lastUsedAt = attributes[MEMORY_ATTRIBUTES.lastUsedAt];
  const decisions = readDecisions(attributes);
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
    ...(Object.keys(decisions).length > 0 && { decisions }),
  };
};
