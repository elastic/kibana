/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import { getUnmappedFieldsFromIngestUpsert } from './validate_ingest_upsert';

describe('getUnmappedFieldsFromIngestUpsert', () => {
  it('returns unmapped wired fields', () => {
    const ingest = IngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: {
        fields: {
          'attributes.doc_only': { type: 'unmapped' },
          'attributes.mapped': { type: 'keyword' },
          'attributes.typeless': { description: 'doc-only' },
        },
        routing: [],
      },
      failure_store: { inherit: {} },
    });

    expect(getUnmappedFieldsFromIngestUpsert(ingest)).toEqual(['attributes.doc_only']);
  });

  it('returns unmapped classic field overrides', () => {
    const ingest = IngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {
          'attributes.doc_only': { type: 'unmapped', description: 'legacy doc-only style' },
          'attributes.typeless': { description: 'new doc-only style' },
        },
      },
      failure_store: { inherit: {} },
    });

    expect(getUnmappedFieldsFromIngestUpsert(ingest)).toEqual(['attributes.doc_only']);
  });

  it('returns empty array when no unmapped types are present', () => {
    const ingest = IngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: {
        fields: {
          'attributes.typeless': { description: 'doc-only' },
          'attributes.keyword': { type: 'keyword', description: 'mapped' },
        },
        routing: [],
      },
      failure_store: { inherit: {} },
    });

    expect(getUnmappedFieldsFromIngestUpsert(ingest)).toEqual([]);
  });
});
