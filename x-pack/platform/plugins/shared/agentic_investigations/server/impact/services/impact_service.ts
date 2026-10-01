/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationEvidence } from '../../../common/evidence';
import type { User } from '../../../common/user';
import {
  MAX_ENTITY_IDS,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
} from '../../../common/impact/constants';
import type { AttachImpactRequest, Impact, ImpactEntity } from '../../../common/impact/impact';
import {
  hashInvestigationAttachmentId,
  InvestigationAttachmentConflictError,
  type InvestigationAttachmentDocService,
  type WrittenInvestigationAttachment,
} from '../../investigation_attachments';
import { impactAttachment } from '../attachments/impact_attachment_type';
import { ImpactConflictError, ImpactInvalidRequestError, ImpactNotFoundError } from './errors';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';

interface ImpactServiceDeps {
  storage: ImpactStorageClient;
}

/** Document indexed by `attach` or `set`, plus the body that write overwrote. */
export type WrittenAttach = WrittenInvestigationAttachment<ImpactDocument>;

/**
 * What the agent reports through `investigations.set_impact`. Each field that is present
 * replaces the stored one; an absent field keeps what is stored. `entities: []` clears them.
 */
export interface SetImpactParams {
  conversationId: string;
  summary?: string;
  evidence?: InvestigationEvidence;
  entities?: ImpactEntity[];
}

/**
 * Owns every write to the impact index. One document per space and conversation:
 * attaching more entities unions them onto that record, which is what
 * hydrate-by-conversationId plus filtering on `entities.id` requires.
 */
export class ImpactService {
  private readonly documents: InvestigationAttachmentDocService<ImpactDocument>;

  constructor(deps: ImpactServiceDeps) {
    this.documents = impactAttachment.createServiceFromStorage(deps.storage);
  }

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<ImpactDocument> {
    return this.documents;
  }

  /** Route and workflow step write: unions `entities` by id onto the stored document. */
  async attach(
    params: AttachImpactRequest,
    { spaceId, user }: { spaceId: string; user?: User }
  ): Promise<WrittenAttach> {
    const entities = unionEntities(params.entities);
    if (entities.length === 0) {
      throw new ImpactInvalidRequestError('entities must contain at least one entity');
    }
    assertEntityCeiling(entities);
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(params.conversationId, 'conversationId');

    return this.write(params.conversationId, spaceId, (existing) => {
      const now = new Date().toISOString();
      if (!existing) {
        return {
          spaceId,
          conversationId: params.conversationId,
          entities,
          createdAt: now,
          createdBy: user,
          updatedAt: now,
        };
      }
      const merged = unionEntities([...(existing.entities ?? []), ...entities]);
      assertEntityCeiling(merged);
      return { ...withoutId(existing), entities: merged, updatedAt: now };
    });
  }

  /**
   * Agent write: a partial snapshot. Present fields replace the stored ones (entities as a
   * whole list, deduped by id); absent fields are kept, so a route attach is not undone by an
   * agent report that only touches the summary.
   */
  async set(
    params: SetImpactParams,
    { spaceId, user }: { spaceId: string; user?: User }
  ): Promise<WrittenAttach> {
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(params.conversationId, 'conversationId');
    const entities = params.entities === undefined ? undefined : unionEntities(params.entities);
    if (entities) {
      assertEntityCeiling(entities);
    }

    return this.write(params.conversationId, spaceId, (existing) => {
      const now = new Date().toISOString();
      const next: ImpactDocument = existing
        ? { ...withoutId(existing), updatedAt: now }
        : {
            spaceId,
            conversationId: params.conversationId,
            createdAt: now,
            createdBy: user,
            updatedAt: now,
          };
      if (params.summary !== undefined) {
        next.summary = params.summary;
      }
      if (params.evidence !== undefined) {
        next.evidence = params.evidence;
      }
      if (entities !== undefined) {
        if (entities.length > 0) {
          next.entities = entities;
        } else {
          delete next.entities;
        }
      }
      return next;
    });
  }

  async getByConversationId(conversationId: string, spaceId: string): Promise<Impact> {
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(conversationId, 'conversationId');
    const existing = await this.documents.get(impactDocumentId(spaceId, conversationId), spaceId);
    if (!existing) {
      throw new ImpactNotFoundError(conversationId);
    }
    return existing;
  }

  /** Like {@link getByConversationId}, but undefined when the conversation has no impact. */
  async findByConversationId(conversationId: string, spaceId: string): Promise<Impact | undefined> {
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(conversationId, 'conversationId');
    return this.documents.get(impactDocumentId(spaceId, conversationId), spaceId);
  }

  /** Loads an Impact document by id for by-reference attachment resolve. */
  async get(id: string, spaceId: string): Promise<Impact> {
    assertBoundedId(spaceId, 'spaceId');
    if (id.length < 1 || id.length > MAX_IMPACT_ID_LENGTH) {
      throw new ImpactNotFoundError(id);
    }

    const existing = await this.documents.get(id, spaceId);
    if (!existing) {
      throw new ImpactNotFoundError(id);
    }
    return existing;
  }

  /**
   * Undoes an attach whose conversation attachment did not land. Deletes a
   * document this call created, or restores `previous`, only while the stored
   * body is still the one `attach` wrote. `previous` is the body that write overwrote.
   */
  async revertAttach(written: WrittenAttach): Promise<void> {
    await this.documents.revert(written);
  }

  /**
   * Bulk hydrate for a landing-page list. Missing conversations are omitted,
   * not 404, so a caller can attach the field only where it exists. No HTTP
   * route: a capped in-process read is not a contract worth exposing.
   */
  async listByConversationIds(conversationIds: string[], spaceId: string): Promise<Impact[]> {
    const ids = [...new Set(conversationIds)];
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

    // The id is one document per space and conversation. A second hit is ignored.
    const byConversationId = new Map<string, Impact>();
    for (const impact of await this.documents.listByConversationIds(ids, spaceId)) {
      if (!byConversationId.has(impact.conversationId)) {
        byConversationId.set(impact.conversationId, impact);
      }
    }
    return [...byConversationId.values()];
  }

  private async write(
    conversationId: string,
    spaceId: string,
    mutate: (existing: Impact | undefined) => ImpactDocument
  ): Promise<WrittenAttach> {
    try {
      return await this.documents.upsert({
        id: impactDocumentId(spaceId, conversationId),
        mutate,
      });
    } catch (error) {
      if (error instanceof InvestigationAttachmentConflictError) {
        throw new ImpactConflictError(conversationId);
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
  hashInvestigationAttachmentId(spaceId, conversationId);

const assertBoundedId = (value: string, field: string): void => {
  if (value.length < 1 || value.length > MAX_IMPACT_ID_LENGTH) {
    throw new ImpactInvalidRequestError(
      `${field} must be between 1 and ${MAX_IMPACT_ID_LENGTH} characters`
    );
  }
};

const assertEntityCeiling = (entities: ImpactEntity[]): void => {
  if (entities.length > MAX_ENTITY_IDS) {
    throw new ImpactInvalidRequestError(
      `entities may not exceed ${MAX_ENTITY_IDS} unique ids for a conversation`
    );
  }
};

const withoutId = ({ id: _id, ...document }: Impact): ImpactDocument => document;

const definedEntity = (entity: ImpactEntity): ImpactEntity => {
  const stored: ImpactEntity = { id: entity.id };
  if (entity.name !== undefined) stored.name = entity.name;
  if (entity.type !== undefined) stored.type = entity.type;
  if (entity.featureId !== undefined) stored.featureId = entity.featureId;
  if (entity.streamName !== undefined) stored.streamName = entity.streamName;
  if (entity.evidence !== undefined) stored.evidence = entity.evidence;
  return stored;
};

/** First write wins the id. A later write fills or replaces only the fields it actually sends. */
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
        evidence: entity.evidence ?? current.evidence,
      })
    );
  }
  return [...byId.values()];
};
