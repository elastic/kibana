/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClassicIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/classic';
import { getTypelessDescriptionFieldsFromClassicIngest } from './validate_ingest_upsert';

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
