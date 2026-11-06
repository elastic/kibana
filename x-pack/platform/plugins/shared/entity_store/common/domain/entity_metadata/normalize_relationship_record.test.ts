/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipMetadataDoc } from './relationship_metadata';
import { normalizeRelationshipRecord, RELATIONSHIP_KINDS } from './relationship_metadata';

const baseDoc = (): RelationshipMetadataDoc =>
  ({
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': 'user:alice@corp',
    'entity.source': 'elastic_defend',
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'scan-1',
      lookback_window: 'now-30d',
    },
  } as RelationshipMetadataDoc);

describe('normalizeRelationshipRecord', () => {
  it.each([...RELATIONSHIP_KINDS])('extracts kind=%s when its target field is present', (kind) => {
    const doc = {
      ...baseDoc(),
      [`entity.relationships.${kind}.target`]: 'host:laptopA',
    } as RelationshipMetadataDoc;

    expect(normalizeRelationshipRecord(doc)).toEqual({
      kind,
      target: 'host:laptopA',
      timestamp: '2026-05-15T10:30:00.000Z',
      source: 'elastic_defend',
    });
  });

  it('returns undefined when no relationship target field is present', () => {
    expect(normalizeRelationshipRecord(baseDoc())).toBeUndefined();
  });

  it('picks the first RELATIONSHIP_KINDS member when a malformed doc has multiple targets (writers emit one kind per doc)', () => {
    const doc = {
      ...baseDoc(),
      'entity.relationships.communicates_with.target': 'host:other',
      'entity.relationships.accesses_frequently.target': 'host:laptopA',
    } as RelationshipMetadataDoc;

    expect(normalizeRelationshipRecord(doc)).toEqual({
      kind: 'accesses_frequently',
      target: 'host:laptopA',
      timestamp: '2026-05-15T10:30:00.000Z',
      source: 'elastic_defend',
    });
  });
});
