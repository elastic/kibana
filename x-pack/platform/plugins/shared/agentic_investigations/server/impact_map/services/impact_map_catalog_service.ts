/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPACT_MAP_CATALOG_TYPES } from '../../../common/impact_map/constants';
import type { ImpactMapCatalog } from '../../../common/impact_map/impact_map';
import { BUILT_IN_CATALOG, normalizeEntityType } from '../../../common/impact_map/built_in_types';
import { mergeImpactMapCatalog } from '../../../common/impact_map/resolve_graph';
import type { User } from '../../../common/user';
import {
  hashInvestigationAttachmentId,
  InvestigationAttachmentDocService,
  InvestigationAttachmentInvalidRequestError,
  type InvestigationAttachmentStorage,
} from '../../investigation_attachments';
import {
  IMPACT_MAP_CATALOG_KEY,
  type ImpactMapCatalogDocument,
} from '../storage/impact_map_storage';

const EMPTY_CATALOG: ImpactMapCatalog = { entity_types: [], relationship_types: [] };

const catalogDocumentId = (spaceId: string): string =>
  hashInvestigationAttachmentId('impact_map_catalog', spaceId);

const toCatalog = (document: ImpactMapCatalogDocument | undefined): ImpactMapCatalog =>
  document
    ? { entity_types: document.entityTypes, relationship_types: document.relationshipTypes }
    : EMPTY_CATALOG;

/** What agents and maps see: the built-in types, with the space's own on top, repaired. */
const withBuiltIns = (stored: ImpactMapCatalog): ImpactMapCatalog => {
  const merged = mergeImpactMapCatalog(BUILT_IN_CATALOG, stored);
  return { ...merged, entity_types: merged.entity_types.map(normalizeEntityType) };
};

/**
 * The entity and relationship types a space's impact maps share, so every investigation draws a
 * database or a `CALLS` edge the same way. Types are only added or replaced by id, never removed:
 * a map keeps its own copy of the types it uses, so a change here does not redraw old maps.
 */
export class ImpactMapCatalogService {
  private readonly documents: InvestigationAttachmentDocService<ImpactMapCatalogDocument>;

  constructor({ storage }: { storage: InvestigationAttachmentStorage<ImpactMapCatalogDocument> }) {
    this.documents = new InvestigationAttachmentDocService<ImpactMapCatalogDocument>({
      type: 'impact_map_catalog',
      storage,
    });
  }

  /** Only what this space stored. */
  async get(spaceId: string): Promise<ImpactMapCatalog> {
    return toCatalog(await this.documents.get(catalogDocumentId(spaceId), spaceId));
  }

  /** What to classify against: built-in types plus the space's, so a new space starts well. */
  async getWithBuiltIns(spaceId: string): Promise<ImpactMapCatalog> {
    return withBuiltIns(await this.get(spaceId));
  }

  /** Adds the types, replacing stored ones with the same id, and returns the whole catalog. */
  async upsert({
    spaceId,
    types,
    user,
  }: {
    spaceId: string;
    types: Partial<ImpactMapCatalog>;
    user?: User;
  }): Promise<ImpactMapCatalog> {
    const nothingToAdd = !types.entity_types?.length && !types.relationship_types?.length;
    if (nothingToAdd) {
      return this.getWithBuiltIns(spaceId);
    }
    const { written } = await this.documents.upsert({
      id: catalogDocumentId(spaceId),
      mutate: (current) => {
        const merged = mergeImpactMapCatalog(toCatalog(current), types);
        if (
          merged.entity_types.length > MAX_IMPACT_MAP_CATALOG_TYPES ||
          merged.relationship_types.length > MAX_IMPACT_MAP_CATALOG_TYPES
        ) {
          throw new InvestigationAttachmentInvalidRequestError(
            `The impact map catalog holds at most ${MAX_IMPACT_MAP_CATALOG_TYPES} entity types and ${MAX_IMPACT_MAP_CATALOG_TYPES} relationship types. Reuse an existing type.`
          );
        }
        return {
          spaceId,
          conversationId: IMPACT_MAP_CATALOG_KEY,
          entityTypes: merged.entity_types.map(normalizeEntityType),
          relationshipTypes: merged.relationship_types,
          updatedAt: new Date().toISOString(),
          ...(user && { updatedBy: user }),
        };
      },
    });
    return withBuiltIns(toCatalog(written));
  }
}
