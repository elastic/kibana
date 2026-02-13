/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import { ClassicIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/classic';
import {
  getUnmappedFieldsFromIngestUpsert,
  getTypelessDescriptionFieldsFromClassicIngest,
} from './validate_ingest_upsert';

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

describe('getTypelessDescriptionFieldsFromClassicIngest', () => {
  it('returns fields with description but no type', () => {
    const ingest = ClassicIngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {
          'attributes.typeless_with_desc': { description: 'doc-only field' },
          'attributes.mapped_with_desc': { type: 'keyword', description: 'has type' },
          'attributes.mapped_no_desc': { type: 'keyword' },
        },
      },
      failure_store: { inherit: {} },
    });

    expect(getTypelessDescriptionFieldsFromClassicIngest(ingest)).toEqual([
      'attributes.typeless_with_desc',
    ]);
  });

  it('returns empty array when all fields have types', () => {
    const ingest = ClassicIngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {
          'attributes.keyword_field': { type: 'keyword', description: 'a keyword field' },
          'attributes.date_field': { type: 'date' },
        },
      },
      failure_store: { inherit: {} },
    });

    expect(getTypelessDescriptionFieldsFromClassicIngest(ingest)).toEqual([]);
  });

  it('returns empty array when field_overrides is empty', () => {
    const ingest = ClassicIngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {},
      },
      failure_store: { inherit: {} },
    });

    expect(getTypelessDescriptionFieldsFromClassicIngest(ingest)).toEqual([]);
  });

  it('returns multiple typeless description fields', () => {
    const ingest = ClassicIngestUpsertRequest.right.parse({
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {
          'attributes.field1': { description: 'first doc-only' },
          'attributes.field2': { description: 'second doc-only' },
          'attributes.mapped': { type: 'keyword' },
        },
      },
      failure_store: { inherit: {} },
    });

    expect(getTypelessDescriptionFieldsFromClassicIngest(ingest)).toEqual([
      'attributes.field1',
      'attributes.field2',
    ]);
  });
});
