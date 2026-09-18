/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProposalUser } from '../../../common/proposals/proposal';
import { MAX_ENTITY_IDS, MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import type { AttachImpactRequest, Impact } from '../../../common/impact/impact';
import { ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';

interface ImpactServiceDeps {
  storage: ImpactStorageClient;
}

/**
 * Owns every write to the impact index. One document per conversation: attaching
 * more entities unions them onto the existing record rather than appending a
 * new one, which is what hydrate-by-conversationId plus `entityIds.includes`
 * requires.
 */
export class ImpactService {
  constructor(private readonly deps: ImpactServiceDeps) {}

  async attach(
    params: AttachImpactRequest,
    { spaceId, user }: { spaceId: string; user?: ProposalUser }
  ): Promise<Impact> {
    const entityIds = uniqueIds(params.entityIds);
    if (entityIds.length === 0) {
      throw new ImpactInvalidRequestError('entityIds must contain at least one id');
    }

    const existing = await this.findByConversationId(params.conversationId, spaceId);
    if (!existing) {
      const id = uuidv4();
      const document: ImpactDocument = {
        spaceId,
        conversationId: params.conversationId,
        entityIds,
        createdAt: new Date().toISOString(),
        createdBy: user,
      };
      await this.deps.storage.index({ id, document, op_type: 'create' });
      return toImpact(id, document);
    }

    const merged = uniqueIds([...existing.entityIds, ...entityIds]);
    if (merged.length > MAX_ENTITY_IDS) {
      throw new ImpactInvalidRequestError(
        `entityIds may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
      );
    }

    const { id, ...stored } = existing;
    const document: ImpactDocument = { ...stored, entityIds: merged };
    await this.deps.storage.index({ id, document });
    return toImpact(id, document);
  }

  async getByConversationId(conversationId: string, spaceId: string): Promise<Impact> {
    const existing = await this.findByConversationId(conversationId, spaceId);
    if (!existing) {
      throw new ImpactNotFoundError(conversationId);
    }
    return existing;
  }

  /**
   * Bulk hydrate for a landing-page list. Missing conversations are omitted,
   * not 404, so a caller can attach the field only where it exists. No HTTP
   * route: a capped in-process read is not a contract worth exposing.
   */
  async listByConversationIds(conversationIds: string[], spaceId: string): Promise<Impact[]> {
    const ids = uniqueIds(conversationIds);
    if (ids.length === 0) {
      return [];
    }
    if (ids.length > MAX_IMPACT_CONVERSATION_IDS) {
      throw new ImpactInvalidRequestError(
        `conversationIds may not exceed ${MAX_IMPACT_CONVERSATION_IDS}`
      );
    }

    const response = await this.deps.storage.search({
      track_total_hits: false,
      size: ids.length,
      query: {
        bool: {
          filter: [{ term: { spaceId } }, { terms: { conversationId: ids } }],
        },
      },
    });

    // First hit wins if a conversation ever accumulated more than one document.
    const byConversationId = new Map<string, Impact>();
    for (const hit of response.hits.hits) {
      if (hit._id === undefined || !hit._source) {
        continue;
      }
      const impact = toImpact(hit._id, hit._source as ImpactDocument);
      if (!byConversationId.has(impact.conversationId)) {
        byConversationId.set(impact.conversationId, impact);
      }
    }

    return [...byConversationId.values()];
  }

  private async findByConversationId(
    conversationId: string,
    spaceId: string
  ): Promise<Impact | undefined> {
    const response = await this.deps.storage.search({
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [{ term: { spaceId } }, { term: { conversationId } }],
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || hit._id === undefined) {
      return undefined;
    }
    return toImpact(hit._id, hit._source as ImpactDocument);
  }
}

const uniqueIds = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique;
};

const toImpact = (id: string, document: ImpactDocument): Impact => ({ id, ...document });
