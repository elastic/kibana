/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationImpactMap } from '../../../common/impact_map/impact_map';
import type { InvestigationImpactMapResponse } from '../../../common';
import { normalizeEntityType } from '../../../common/impact_map/built_in_types';

/**
 * The shape the investigation flyout and the map renderer read, from the stored document, so a
 * card in the chat shows what the Impact map and Timeline tabs show without another request.
 * Relationships get the same `source->target` id the API gives them.
 */
export const toImpactMapResponse = (
  document: InvestigationImpactMap
): InvestigationImpactMapResponse => ({
  ...(document.title && { title: document.title }),
  entities: document.entities,
  relationships: document.relationships.map((relationship) => ({
    ...relationship,
    id: relationship.id ?? `${relationship.source_id}->${relationship.target_id}`,
  })),
  // A type saved without an icon is given one here, so no node is drawn blank.
  entity_types: document.entityTypes.map(normalizeEntityType),
  relationship_types: document.relationshipTypes,
  events: [...(document.events ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
  created_at: document.createdAt,
  ...(document.updatedAt && { updated_at: document.updatedAt }),
});
