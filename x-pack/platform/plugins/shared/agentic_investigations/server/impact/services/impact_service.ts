/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { User } from '../../../common/user';
import {
  MAX_ENTITY_IDS,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
} from '../../../common/impact/constants';
import type { AttachImpactRequest, Impact, ImpactEntity } from '../../../common/impact/impact';
import { ImpactConflictError, ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';

interface ImpactServiceDeps {
  storage: ImpactStorageClient;
}

/** Two writers converge on the retry; the third attempt is spare. */
const MAX_ATTACH_ATTEMPTS = 3;

interface VersionedImpact extends Impact {
  seqNo: number;
  primaryTerm: number;
}

/**
 * Owns every write to the impact index. One document per space and conversation:
 * attaching more entities unions them onto that record, which is what
 * hydrate-by-conversationId plus filtering on `entities.id` requires.
 */
export class ImpactService {
  constructor(private readonly deps: ImpactServiceDeps) {}

  async attach(
    params: AttachImpactRequest,
    { spaceId, user }: { spaceId: string; user?: User }
  ): Promise<Impact> {
    const entities = unionEntities(params.entities);
    if (entities.length === 0) {
      throw new ImpactInvalidRequestError('entities must contain at least one entity');
    }
    if (entities.length > MAX_ENTITY_IDS) {
      throw new ImpactInvalidRequestError(
        `entities may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
      );
    }
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(params.conversationId, 'conversationId');

    const id = impactDocumentId(spaceId, params.conversationId);
    for (let attempt = 0; attempt < MAX_ATTACH_ATTEMPTS; attempt++) {
      const written = await this.writeAttach(id, params.conversationId, spaceId, entities, user);
      if (written) {
        return written;
      }
    }

    throw new ImpactConflictError(params.conversationId);
  }

  async getByConversationId(conversationId: string, spaceId: string): Promise<Impact> {
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(conversationId, 'conversationId');
    const existing = await this.findById(impactDocumentId(spaceId, conversationId));
    if (!existing) {
      throw new ImpactNotFoundError(conversationId);
    }
    return withoutVersion(existing);
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

    // The id is one document per space and conversation. A second hit is ignored.
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

  /**
   * Returns the written impact, or undefined when a concurrent attach won the
   * version check and the caller should re-read and union again.
   */
  private async writeAttach(
    id: string,
    conversationId: string,
    spaceId: string,
    entities: ImpactEntity[],
    user?: User
  ): Promise<Impact | undefined> {
    const existing = await this.findById(id);
    if (!existing) {
      const document: ImpactDocument = {
        spaceId,
        conversationId,
        entities,
        createdAt: new Date().toISOString(),
        createdBy: user,
      };
      try {
        await this.deps.storage.index({ id, document, op_type: 'create' });
        return toImpact(id, document);
      } catch (error) {
        if (isVersionConflict(error)) {
          return undefined;
        }
        throw error;
      }
    }

    const merged = unionEntities([...existing.entities, ...entities]);
    if (merged.length > MAX_ENTITY_IDS) {
      throw new ImpactInvalidRequestError(
        `entities may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
      );
    }

    const document: ImpactDocument = {
      spaceId: existing.spaceId,
      conversationId: existing.conversationId,
      entities: merged,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
    };
    try {
      await this.deps.storage.index({
        id,
        document,
        if_seq_no: existing.seqNo,
        if_primary_term: existing.primaryTerm,
      });
      return toImpact(id, document);
    } catch (error) {
      if (isVersionConflict(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async findById(id: string): Promise<VersionedImpact | undefined> {
    try {
      const hit = await this.deps.storage.get({ id });
      if (!hit._source || hit._seq_no === undefined || hit._primary_term === undefined) {
        throw new Error(`Impact document [${id}] is missing concurrency metadata`);
      }
      return {
        ...toImpact(hit._id, hit._source),
        seqNo: hit._seq_no,
        primaryTerm: hit._primary_term,
      };
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }
}

/**
 * One impact document per space and conversation. Joining the two keys can
 * exceed Elasticsearch's 512-byte `_id` limit, so the id is a hash of a
 * length-prefixed pair.
 */
export const impactDocumentId = (spaceId: string, conversationId: string): string =>
  createHash('sha256')
    .update(`${spaceId.length}:${spaceId}\0${conversationId.length}:${conversationId}`)
    .digest('hex');

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

const withoutVersion = ({
  seqNo: _seqNo,
  primaryTerm: _primaryTerm,
  ...impact
}: VersionedImpact): Impact => impact;

const statusCodeOf = (error: unknown): number | undefined => {
  const candidate = error as { statusCode?: number; meta?: { statusCode?: number } };
  return candidate.statusCode ?? candidate.meta?.statusCode;
};

const isNotFound = (error: unknown): boolean => statusCodeOf(error) === 404;

const isVersionConflict = (error: unknown): boolean => statusCodeOf(error) === 409;
