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
import { unionEntities } from '../../../common/impact/union_entities';
import {
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
 * What the agent reports through `agentic_investigations.set_impact`. Each field that is present
 * replaces the stored one; an absent field keeps what is stored. `null` removes `summary` or
 * `evidence`, and `entities: []` removes the entities.
 */
export interface SetImpactParams {
  conversationId: string;
  summary?: string | null;
  evidence?: InvestigationEvidence | null;
  entities?: ImpactEntity[];
}

/**
 * Owns every write to the impact index. One document per space and conversation:
 * attaching more entities unions them onto that record, which is what
 * hydrate-by-conversationId plus filtering on `entities.id` requires.
 */
export class ImpactService {
  private readonly documents: InvestigationAttachmentDocService<ImpactDocument>;

  constructor(private readonly deps: ImpactServiceDeps) {
    this.documents = impactAttachment.createServiceFromStorage(deps.storage);
  }

  private mappingsReconciled?: Promise<void>;

  /** Applies pending mapping changes, which ES|QL reads do not trigger. Once per process. */
  reconcileMappings(): Promise<void> {
    this.mappingsReconciled ??= this.deps.storage.reconcileMappings().catch((error) => {
      this.mappingsReconciled = undefined;
      throw error;
    });
    return this.mappingsReconciled;
  }

  /** Stored `type` and `name` per entity id; unknown ids are absent. */
  async getEntityLabels(
    entityIds: string[],
    spaceId: string
  ): Promise<Map<string, Pick<ImpactEntity, 'type' | 'name'>>> {
    if (entityIds.length === 0) {
      return new Map();
    }
    assertBoundedId(spaceId, 'spaceId');
    const response = await this.deps.storage.search({
      size: 0,
      track_total_hits: false,
      query: { bool: { filter: [{ term: { spaceId } }] } },
      aggs: {
        entities: {
          nested: { path: 'entities' },
          aggs: {
            listed: {
              filter: { terms: { 'entities.id': entityIds } },
              aggs: {
                by_id: {
                  terms: { field: 'entities.id', size: entityIds.length },
                  aggs: {
                    type: { terms: { field: 'entities.type', size: 1 } },
                    name: { terms: { field: 'entities.name', size: 1 } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const buckets = response.aggregations?.entities.listed.by_id.buckets ?? [];
    return new Map(
      buckets.map(({ key, type, name }) => [
        String(key),
        {
          ...(type.buckets[0] ? { type: String(type.buckets[0].key) } : {}),
          ...(name.buckets[0] ? { name: String(name.buckets[0].key) } : {}),
        },
      ])
    );
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
   * whole list, deduped by id) and `null` removes them; absent fields are kept, so a route
   * attach is not undone by an agent report that only touches the summary.
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
      if (params.summary === null) {
        delete next.summary;
      } else if (params.summary !== undefined) {
        next.summary = params.summary;
      }
      if (params.evidence === null) {
        delete next.evidence;
      } else if (params.evidence !== undefined) {
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
    return toImpact(existing);
  }

  /** Like {@link getByConversationId}, but undefined when the conversation has no impact. */
  async findByConversationId(conversationId: string, spaceId: string): Promise<Impact | undefined> {
    assertBoundedId(spaceId, 'spaceId');
    assertBoundedId(conversationId, 'conversationId');
    const existing = await this.documents.get(impactDocumentId(spaceId, conversationId), spaceId);
    return existing && toImpact(existing);
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
    return [...byConversationId.values()].map(toImpact);
  }

  private async write(
    conversationId: string,
    spaceId: string,
    mutate: (existing: Impact | undefined) => ImpactDocument
  ): Promise<WrittenAttach> {
    try {
      return await this.documents.upsert({
        id: impactDocumentId(spaceId, conversationId),
        mutate: (existing) => withEntityIds(mutate(existing)),
      });
    } catch (error) {
      if (error instanceof InvestigationAttachmentConflictError) {
        throw new ImpactConflictError(conversationId);
      }
      throw error;
    }
  }
}

/** One impact document per space and conversation. */
export const impactDocumentId = (spaceId: string, conversationId: string): string =>
  impactAttachment.documentId(spaceId, conversationId);

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

/** Drops the storage-only `entityIds`. */
const toImpact = ({
  entityIds: _entityIds,
  ...impact
}: Impact & { entityIds?: string[] }): Impact => impact;

/** Derives the flat `entityIds` from `entities`. */
const withEntityIds = (document: ImpactDocument): ImpactDocument => {
  const { entityIds: _stale, ...rest } = document;
  const ids = (rest.entities ?? []).map(({ id }) => id);
  return ids.length > 0 ? { ...rest, entityIds: ids } : rest;
};
