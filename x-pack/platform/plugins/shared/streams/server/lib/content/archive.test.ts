/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ContentPackStreamRequest } from '@kbn/content-packs-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { isContentPackStreamRequest } from './archive';

const wiredUpsert: ContentPackStreamRequest = {
  ...emptyAssets,
  queries: [],
  stream: {
    type: 'wired',
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: { fields: {}, routing: [] },
      failure_store: { inherit: {} },
    },
  },
};

const validQuery = {
  id: 'query-1',
  title: 'A query',
  description: '',
  esql: { query: 'FROM logs | LIMIT 1' },
};

describe('isContentPackStreamRequest', () => {
  it('accepts a wired upsert request with an empty queries array', () => {
    expect(isContentPackStreamRequest(wiredUpsert)).toBe(true);
  });

  it('accepts a wired upsert request with valid queries', () => {
    expect(isContentPackStreamRequest({ ...wiredUpsert, queries: [validQuery] })).toBe(true);
  });

  it('rejects a request that is missing the queries field', () => {
    const { queries: _queries, ...withoutQueries } = wiredUpsert;
    expect(isContentPackStreamRequest(withoutQueries)).toBe(false);
  });

  it('rejects queries that are not a valid StreamQuery array', () => {
    expect(isContentPackStreamRequest({ ...wiredUpsert, queries: [{ id: 'no-title' }] })).toBe(
      false
    );
    expect(isContentPackStreamRequest({ ...wiredUpsert, queries: 'not-an-array' })).toBe(false);
  });

  it('rejects an invalid wired upsert shape', () => {
    expect(isContentPackStreamRequest({ queries: [], stream: { type: 'wired' } })).toBe(false);
  });

  it('rejects unknown keys on the upsert request (strict)', () => {
    expect(isContentPackStreamRequest({ ...wiredUpsert, unexpected: true })).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isContentPackStreamRequest(null)).toBe(false);
    expect(isContentPackStreamRequest('string')).toBe(false);
    expect(isContentPackStreamRequest(undefined)).toBe(false);
  });
});
