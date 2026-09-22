/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProposalUser } from '../../../common/proposals/proposal';
import {
  MAX_ENTITY_IDS,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
} from '../../../common/impact/constants';
import type { AttachImpactRequest, Impact, ImpactEntity } from '../../../common/impact/impact';
import { ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';

interface ImpactServiceDeps {
  storage: ImpactStorageClient;
}

/**
 * Owns every write to the impact index. One document per conversation: attaching
 * more entities unions them onto the existing record rather than appending a
 * new one, which is what hydrate-by-conversationId plus filtering on
 * `entities.id` requires.
 */
export class ImpactService {
  constructor(private readonly deps: ImpactServiceDeps) {}

  async attach(
    params: AttachImpactRequest,
    { spaceId, user }: { spaceId: string; user?: ProposalUser }
  ): Promise<Impact> {
    const entities = unionEntities(params.entities);
    if (entities.length === 0) {
      throw new ImpactInvalidRequestError('entities must contain at least one entity');
    }

    const existing = await this.findByConversationId(params.conversationId, spaceId);
    if (entityIds.length === 0) {
      throw new ImpactInvalidRequestError('entityIds must contain at least one id');
    }
    if (entityIds.length > MAX_ENTITY_IDS) {
      throw new ImpactInvalidRequestError(
        `entityIds may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
      );
    }
        spaceId,
        conversationId: params.conversationId,
        entities,
        createdAt: new Date().toISOString(),
        createdBy: user,
      };
      await this.deps.storage.index({ id, document, op_type: 'create' });
      return toImpact(id, document);
    }

    const merged = unionEntities([...existing.entities, ...entities]);
    if (merged.length > MAX_ENTITY_IDS) {
      throw new ImpactInvalidRequestError(
        `entities may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
      );
    }

    const { id, ...stored } = existing;
    const document: ImpactDocument = { ...stored, entities: merged };
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
    assertBoundedId(spaceId, 'spaceId');
    for (const conversationId of ids) {
      assertBoundedId(conversationId, 'conversationId');
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

const assertBoundedId = (value: string, field: string): void => {
  if (value.length < 1 || value.length > MAX_IMPACT_ID_LENGTH) {
    throw new ImpactInvalidRequestError(
      `${field} must be between 1 and ${MAX_IMPACT_ID_LENGTH} characters`
    );
  }
};

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

const definedEntity = (entity: ImpactEntity): ImpactEntity => {
  const stored: ImpactEntity = { id: entity.id };
  if (entity.name !== undefined) stored.name = entity.name;
  if (entity.type !== undefined) stored.type = entity.type;
  if (entity.featureId !== undefined) stored.featureId = entity.featureId;
  if (entity.streamName !== undefined) stored.streamName = entity.streamName;
  return stored;
};

/** First write wins the id. A later write fills only the fields it actually sends. */
const unionEntities = (entities: ImpactEntity[]): ImpactEntity[] => {
  const byId = new Map<string, ImpactEntity>();
  for (const entity of entities) {
    const current = byId.get(entity.id);
    if (!current) {
      byId.set(entity.id, definedEntity(entity));
      continue;
    }
    byId.set(
      entity.id,
      definedEntity({
        id: current.id,
        name: entity.name ?? current.name,
        type: entity.type ?? current.type,
        featureId: entity.featureId ?? current.featureId,
        streamName: entity.streamName ?? current.streamName,
      })
    );
  }
  return [...byId.values()];
};

const toImpact = (id: string, document: ImpactDocument): Impact => ({ id, ...document });
