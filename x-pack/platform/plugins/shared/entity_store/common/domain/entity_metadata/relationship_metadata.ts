/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RELATIONSHIP_OBSERVED_ACTION = 'relationship_observed' as const;

export const RELATIONSHIP_KINDS = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
  'administers',
  'depends_on',
  'owns',
  'supervises',
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

type RelationshipTargetKey = `entity.relationships.${RelationshipKind}.target`;

export interface RelationshipMetadataMaintainer {
  kind: string;
  scan_id: string;
  lookback_window: string;
}

export type RelationshipMetadataDoc = {
  '@timestamp': string;
  'event.kind': 'event';
  'event.action': typeof RELATIONSHIP_OBSERVED_ACTION;
  'event.ingested'?: string;
  'entity.id': string;
  'entity.source': string;
  'related.user'?: string[];
  'related.hosts'?: string[];
  Maintainer: RelationshipMetadataMaintainer;
} & {
  [K in RelationshipTargetKey]?: string;
};

/**
 * Projects a raw metadata doc into `{ kind, target, timestamp, source }`.
 * Returns `undefined` when the doc has no recognized relationship target field.
 */
export const normalizeRelationshipRecord = (doc: RelationshipMetadataDoc) => {
  for (const kind of RELATIONSHIP_KINDS) {
    const target = doc[`entity.relationships.${kind}.target`];
    if (target) {
      return {
        kind,
        target,
        timestamp: doc['@timestamp'],
        source: doc['entity.source'],
      };
    }
  }
};
