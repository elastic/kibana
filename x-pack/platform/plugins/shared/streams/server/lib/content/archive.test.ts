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

describe('isContentPackStreamRequest', () => {
  it('accepts a wired upsert request', () => {
    expect(isContentPackStreamRequest(wiredUpsert)).toBe(true);
  });

  it('rejects unknown keys on the upsert request (strict)', () => {
    expect(isContentPackStreamRequest({ ...wiredUpsert, unexpected: true })).toBe(false);
  });

  it('rejects a request carrying significant-event queries', () => {
    // Queries are no longer part of content packs, so the strict wired upsert guard
    // rejects them. `extractEntries` strips the field before calling this guard so
    // older query-bearing archives still import as structural-only packs.
    expect(isContentPackStreamRequest({ ...wiredUpsert, queries: [] })).toBe(false);
  });

  it('rejects an invalid wired upsert shape', () => {
    expect(isContentPackStreamRequest({ stream: { type: 'wired' } })).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isContentPackStreamRequest(null)).toBe(false);
    expect(isContentPackStreamRequest('string')).toBe(false);
    expect(isContentPackStreamRequest(undefined)).toBe(false);
  });
});
