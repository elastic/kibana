/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalEntityTypeId, normalizeEntityType } from './built_in_types';
import { MAX_IMPACT_MAP_TYPE_FIELDS } from './constants';
import type {
  ImpactMapCatalog,
  ImpactMapEntity,
  ImpactMapEntityType,
  ImpactMapRelationship,
  ImpactMapRelationshipType,
} from './impact_map';

export interface ResolvedImpactMapGraph {
  entities: ImpactMapEntity[];
  /** Every relationship has an id. */
  relationships: Array<ImpactMapRelationship & { id: string }>;
  /** Only the types the graph uses: the copy the map document keeps. */
  entityTypes: ImpactMapEntityType[];
  relationshipTypes: ImpactMapRelationshipType[];
  /** Types the graph needs that the catalog does not have yet. */
  newTypes: ImpactMapCatalog;
  /** Problems that make the graph unusable; nothing should be written while there are any. */
  errors: string[];
  /** Problems that were repaired; worth telling the agent so the next write is cleaner. */
  warnings: string[];
}

const relationshipIdFor = ({
  source_id: source,
  target_id: target,
  type_id: type,
}: ImpactMapRelationship) => `${source}->${target}:${type}`;

const humanize = (id: string): string =>
  id
    .split(/[_.-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * Joins a graph with the types it references. A type the graph sends inline wins over the
 * catalog's; a type nobody defined is made up from its id (and reported) so one missing type does
 * not cost the agent the whole map. Endpoints that name no entity are errors: the edge has
 * nowhere to draw.
 */
export const resolveImpactMapGraph = ({
  entities,
  relationships,
  catalog,
  entityTypes: rawInlineEntityTypes = [],
  relationshipTypes: inlineRelationshipTypes = [],
}: {
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  catalog: ImpactMapCatalog;
  entityTypes?: ImpactMapEntityType[];
  relationshipTypes?: ImpactMapRelationshipType[];
}): ResolvedImpactMapGraph => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inlineEntityTypes = rawInlineEntityTypes.map((type) =>
    normalizeEntityType({ ...type, id: canonicalEntityTypeId(type.id) })
  );

  const catalogEntityTypes = new Map(catalog.entity_types.map((type) => [type.id, type]));
  const catalogRelationshipTypes = new Map(
    catalog.relationship_types.map((type) => [type.id, type])
  );
  const entityTypes = new Map(catalogEntityTypes);
  inlineEntityTypes.forEach((type) => entityTypes.set(type.id, type));
  const relationshipTypes = new Map(catalogRelationshipTypes);
  inlineRelationshipTypes.forEach((type) => relationshipTypes.set(type.id, type));

  const newEntityTypes = new Map(
    inlineEntityTypes.filter(({ id }) => !catalogEntityTypes.has(id)).map((type) => [type.id, type])
  );
  const newRelationshipTypes = new Map(
    inlineRelationshipTypes
      .filter(({ id }) => !catalogRelationshipTypes.has(id))
      .map((type) => [type.id, type])
  );

  const entityIds = new Set<string>();
  const keptEntities: ImpactMapEntity[] = [];
  for (const rawEntity of entities) {
    // An old id (`k8s_pod`) is the type it became (`k8s.pod`).
    const entity = { ...rawEntity, type_id: canonicalEntityTypeId(rawEntity.type_id) };
    if (entityIds.has(entity.id)) {
      errors.push(`Entity id "${entity.id}" is used more than once.`);
      continue;
    }
    entityIds.add(entity.id);
    if (!entityTypes.has(entity.type_id)) {
      const made: ImpactMapEntityType = {
        id: entity.type_id,
        label: humanize(entity.type_id),
        kind: 'service',
      };
      entityTypes.set(made.id, made);
      newEntityTypes.set(made.id, made);
      warnings.push(
        `Entity type "${entity.type_id}" was not in the catalog; it was added as a service type. Define it with a kind and icon to draw it properly.`
      );
    }
    keptEntities.push(entity);
  }

  // A parent that is not in the map, or that leads back to the entity, would draw a box around
  // nothing; drop the link and keep the entity.
  const parentOf = new Map(
    keptEntities.flatMap(({ id, parent_id: parentId }) => (parentId ? [[id, parentId]] : []))
  );
  const isInside = (start: string, ancestorId: string): boolean => {
    const seen = new Set<string>();
    for (let id: string | undefined = start; id && !seen.has(id); id = parentOf.get(id)) {
      if (id === ancestorId) return true;
      seen.add(id);
    }
    return false;
  };
  keptEntities.forEach((entity, index) => {
    const { parent_id: parentId } = entity;
    if (!parentId) return;
    const reason = !entityIds.has(parentId)
      ? 'is not an entity'
      : parentId === entity.id || isInside(parentId, entity.id)
      ? 'would put the entity inside itself'
      : undefined;
    if (reason) {
      warnings.push(
        `Entity "${entity.id}" has parent_id "${parentId}", which ${reason}; it was dropped.`
      );
      const { parent_id: _dropped, ...rest } = entity;
      keptEntities[index] = rest;
      parentOf.delete(entity.id);
    }
  });

  const relationshipIds = new Set<string>();
  const keptRelationships: Array<ImpactMapRelationship & { id: string }> = [];
  for (const relationship of relationships) {
    const id = relationship.id ?? relationshipIdFor(relationship);
    const missing = [relationship.source_id, relationship.target_id].filter(
      (endpoint) => !entityIds.has(endpoint)
    );
    if (missing.length > 0) {
      errors.push(
        `Relationship "${id}" points at ${missing
          .map((endpoint) => `"${endpoint}"`)
          .join(' and ')}, which ${missing.length > 1 ? 'are not entities' : 'is not an entity'}.`
      );
      continue;
    }
    if (relationshipIds.has(id)) {
      warnings.push(`Relationship "${id}" was listed more than once; the first was kept.`);
      continue;
    }
    relationshipIds.add(id);
    if (!relationshipTypes.has(relationship.type_id)) {
      const made: ImpactMapRelationshipType = {
        id: relationship.type_id,
        label: relationship.type_id.toUpperCase(),
      };
      relationshipTypes.set(made.id, made);
      newRelationshipTypes.set(made.id, made);
      warnings.push(
        `Relationship type "${relationship.type_id}" was not in the catalog; it was added with the label "${made.label}".`
      );
    }
    keptRelationships.push({ ...relationship, id });
  }

  const usedEntityTypeIds = new Set(keptEntities.map(({ type_id: typeId }) => typeId));
  const usedRelationshipTypeIds = new Set(keptRelationships.map(({ type_id: typeId }) => typeId));

  return {
    entities: keptEntities,
    relationships: keptRelationships,
    entityTypes: [...entityTypes.values()].filter(({ id }) => usedEntityTypeIds.has(id)),
    relationshipTypes: [...relationshipTypes.values()].filter(({ id }) =>
      usedRelationshipTypeIds.has(id)
    ),
    newTypes: {
      entity_types: [...newEntityTypes.values()],
      relationship_types: [...newRelationshipTypes.values()],
    },
    errors,
    warnings,
  };
};

/**
 * Merges types into a catalog by id: an incoming type updates the stored one with the same id, the
 * rest are appended, and the order is otherwise kept. A field the incoming type leaves out, an
 * icon the model did not repeat for instance, keeps its stored value.
 */
const mergeType = <T extends { id: string }>(before: T, after: T): T => {
  const merged: T & { icon?: object } = { ...before, ...after };
  const icons = [(before as { icon?: object }).icon, (after as { icon?: object }).icon];
  if (icons[0] || icons[1]) {
    merged.icon = { ...icons[0], ...icons[1] };
  }
  // Fields add up by key, so a pass that learns one more does not forget the rest.
  const fields = [
    (before as { metadata_fields?: Array<{ key: string }> }).metadata_fields,
    (after as { metadata_fields?: Array<{ key: string }> }).metadata_fields,
  ];
  if (fields[0] || fields[1]) {
    const byKey = new Map<string, { key: string }>();
    [...(fields[0] ?? []), ...(fields[1] ?? [])].forEach((field) =>
      byKey.set(field.key, { ...byKey.get(field.key), ...field })
    );
    (merged as { metadata_fields?: unknown }).metadata_fields = [...byKey.values()].slice(
      0,
      MAX_IMPACT_MAP_TYPE_FIELDS
    );
  }
  return merged;
};

export const mergeImpactMapCatalog = (
  current: ImpactMapCatalog,
  incoming: Partial<ImpactMapCatalog>
): ImpactMapCatalog => {
  const merge = <T extends { id: string }>(stored: T[], added: T[] = []): T[] => {
    const byId = new Map(stored.map((type) => [type.id, type]));
    added.forEach((type) => {
      const before = byId.get(type.id);
      byId.set(type.id, before ? mergeType(before, type) : type);
    });
    return [...byId.values()];
  };
  return {
    entity_types: merge(current.entity_types, incoming.entity_types),
    relationship_types: merge(current.relationship_types, incoming.relationship_types),
  };
};
