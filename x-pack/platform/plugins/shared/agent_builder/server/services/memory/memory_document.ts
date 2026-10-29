/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { toUserPrincipal } from '@kbn/agent-builder-server/identity';
import type { ShortTermMemoryPromotion, ShortTermMemoryType } from '@kbn/agent-builder-common';
import {
  MEMORY_ATTRIBUTES,
  SHORT_TERM_MEMORY_KI_TYPE_PREFIX,
  toShortTermMemory,
} from '../../../common/short_term_memory';

export { MEMORY_ATTRIBUTES, SHORT_TERM_MEMORY_KI_TYPE_PREFIX, toShortTermMemory };

/**
 * A short-term memory is scoped to its owner: its only required "action" is the owner's user
 * principal. No role grants that, so Elasticsearch's document-level security hides it from every
 * direct query (superusers and explicit index grants aside), while Context Engine's reads show it
 * to its owner and to administrators.
 */
export const shortTermMemoryPermissions = (
  space: string,
  userId: string
): ShortTermMemoryKiDocument['permissions'] => ({
  kibana: { privileges: [{ space, name: [toUserPrincipal(userId)], count: 1 }] },
});

/** A memory deleted through the AI index KI API is a tombstone until decay removes it. */
export const notDeletedFilter: QueryDslQueryContainer = {
  bool: { must_not: [{ term: { 'governance.lifecycle.status': 'deleted' } }] },
};

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

const PROMOTION_PREFIX = 'memory.promotion.';
/** Each deciding automation's own decision: `memory.decisions.<decider>.status` and so on. */
const DECISIONS_PREFIX = 'memory.decisions.';

type PromotionInput = Omit<ShortTermMemoryPromotion, 'updated_at'> & { updated_at?: string };

const promotionFields = (prefix: string, promotion: PromotionInput): Record<string, string> => ({
  [`${prefix}status`]: promotion.status,
  ...(promotion.reason !== undefined && { [`${prefix}reason`]: promotion.reason }),
  ...(promotion.ai_index_id !== undefined && { [`${prefix}ai_index_id`]: promotion.ai_index_id }),
  ...(promotion.ki_id !== undefined && { [`${prefix}ki_id`]: promotion.ki_id }),
  ...(promotion.updated_at !== undefined && { [`${prefix}updated_at`]: promotion.updated_at }),
});

const withoutPrefix = (
  attributes: Record<string, string>,
  prefix: string
): Record<string, string> =>
  Object.fromEntries(Object.entries(attributes).filter(([key]) => !key.startsWith(prefix)));

/** A decider id as one segment of a flattened attribute key: dots would nest it. */
const deciderKey = (decider: string): string => decider.replace(/[^A-Za-z0-9_-]/g, '_');

const decisionPrefix = (decider: string): string => `${DECISIONS_PREFIX}${deciderKey(decider)}.`;

/** The summary every reader shows: the latest decision, or a promotion by any decider. */
export const promotionAttributes = (promotion: PromotionInput): Record<string, string> =>
  promotionFields(PROMOTION_PREFIX, promotion);

/** One decider's own decision, kept next to the other deciders'. */
export const decisionAttributes = (
  decider: string,
  promotion: PromotionInput
): Record<string, string> => promotionFields(decisionPrefix(decider), promotion);

export const decisionStatusAttribute = (decider: string): string =>
  `${decisionPrefix(decider)}status`;

/** Drops the summary and every decider's decision, so a revised memory is decided afresh. */
export const withoutPromotion = (attributes: Record<string, string>): Record<string, string> =>
  withoutPrefix(withoutPrefix(attributes, PROMOTION_PREFIX), DECISIONS_PREFIX);

export const withoutPromotionSummary = (
  attributes: Record<string, string>
): Record<string, string> => withoutPrefix(attributes, PROMOTION_PREFIX);

export const withoutDecision = (
  attributes: Record<string, string>,
  decider: string
): Record<string, string> => withoutPrefix(attributes, decisionPrefix(decider));

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
