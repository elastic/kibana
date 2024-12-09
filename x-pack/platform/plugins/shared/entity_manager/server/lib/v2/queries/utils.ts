/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityV2 } from '@kbn/entities-schema';
import { orderBy, uniq } from 'lodash';
import { EntitySourceDefinition, SortBy } from '../types';

function getLatestDate(date1?: string, date2?: string) {
  if (!date1 && !date2) return;

  return new Date(
    Math.max(date1 ? Date.parse(date1) : 0, date2 ? Date.parse(date2) : 0)
  ).toISOString();
}

function mergeEntities(metadataFields: string[], entity1: EntityV2, entity2: EntityV2): EntityV2 {
  const merged: EntityV2 = { ...entity1 };

  const latestTimestamp = getLatestDate(
    entity1['entity.last_seen_timestamp'],
    entity2['entity.last_seen_timestamp']
  );
  if (latestTimestamp) {
    merged['entity.last_seen_timestamp'] = latestTimestamp;
  }

  for (const [key, value] of Object.entries(entity2).filter(([_key]) =>
    metadataFields.includes(_key)
  )) {
    if (merged[key]) {
      merged[key] = uniq([
        ...(Array.isArray(merged[key]) ? merged[key] : [merged[key]]),
        ...(Array.isArray(value) ? value : [value]),
      ]);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function mergeEntitiesList({
  entities,
  sources,
  metadataFields,
}: {
  entities: EntityV2[];
  sources: EntitySourceDefinition[];
  metadataFields: string[];
}): EntityV2[] {
  const mergeableFields = uniq([
    ...sources.flatMap((source) => source.metadata_fields),
    ...metadataFields,
  ]);
  const instances: { [key: string]: EntityV2 } = {};

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const id = entity['entity.id'];

    if (instances[id]) {
      instances[id] = mergeEntities(mergeableFields, instances[id], entity);
    } else {
      instances[id] = entity;
    }
  }

  return Object.values(instances);
}

export function sortEntitiesList({
  entities,
  sources,
  sort,
}: {
  entities: EntityV2[];
  sources: EntitySourceDefinition[];
  sort?: SortBy;
}) {
  if (!sort) {
    sort = defaultSort(sources);
  }

  return orderBy(entities, sort.field, sort.direction.toLowerCase() as 'asc' | 'desc');
}

export function asKeyword(field: string) {
  return `${field}::keyword`;
}

export function defaultSort(sources: EntitySourceDefinition[]): SortBy {
  if (sources.some((source) => source.timestamp_field)) {
    return { field: 'entity.last_seen_timestamp', direction: 'DESC' };
  }

  return { field: 'entity.id', direction: 'ASC' };
}
