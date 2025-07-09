/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_BASE_PREFIX,
  ENTITY_HISTORY,
  ENTITY_LATEST,
  ENTITY_SCHEMA_VERSION_V1,
  EntityDefinition,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import {
  ENTITY_HISTORY_PREFIX_V1,
  ENTITY_LATEST_PREFIX_V1,
} from '../../../../common/constants_entities';

// History
function generateHistoryId(definition: EntityDefinition) {
  return `${ENTITY_HISTORY_PREFIX_V1}-${definition.id}` as const;
}

export const generateHistoryTransformId = generateHistoryId;
export const generateHistoryIngestPipelineId = generateHistoryId;

export function generateHistoryIndexName(definition: EntityDefinition) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_HISTORY,
    definitionId: definition.id,
  });
}

export function generateHistoryIndexTemplateId(definition: EntityDefinition) {
  return `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_HISTORY}_${definition.id}_index_template` as const;
}

// Latest
function generateLatestId(definition: EntityDefinition) {
  return `${ENTITY_LATEST_PREFIX_V1}-${definition.id}` as const;
}

export const generateLatestTransformId = generateLatestId;
export const generateLatestIngestPipelineId = generateLatestId;

export function generateLatestIndexName(definition: EntityDefinition) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: definition.id,
  });
}

export const generateLatestIndexTemplateId = (definition: EntityDefinition) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_LATEST}_${definition.id}_index_template` as const;

// Latest Backfill
function generateLatestBackfillId(definition: EntityDefinition) {
  return `${ENTITY_LATEST_PREFIX_V1}-${definition.id}-backfill` as const;
}

export function generateLatestBackfillTransformId(definition: EntityDefinition, unique?: string) {
  const suffix = unique ? `-${unique}` : '';
  return `${ENTITY_LATEST_PREFIX_V1}-${definition.id}-backfill${suffix}` as const;
}

export function generateLatestBackfillIndexName(definition: EntityDefinition, unique?: string) {
  const segments = entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: definition.id,
  }).split('_');
  // insert 'backfill' (and unique, if present) as penultimate segments, before the namespace
  // e.g. foo_bar_baz -> foo_bar_backfill_baz OR foo_bar_backfill_${unique}_baz
  if (unique) {
    segments.splice(-1, 0, 'backfill', unique)
  } else {
    segments.splice(-1, 0, 'backfill');
  }
  return segments.join('_') as const;
}

export const generateLatestBackfillIngestPipelineId = generateLatestBackfillId;
