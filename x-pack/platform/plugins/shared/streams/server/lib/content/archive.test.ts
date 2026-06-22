/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ContentPackStreamRequest } from '@kbn/content-packs-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { isContentPackStreamRequest, stripQueriesOrReject } from './archive';
import { InvalidContentPackError } from './error';

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
    // rejects them. `extractEntries` rejects archives carrying non-empty queries and
    // strips an empty `queries: []` before calling this guard.
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

describe('stripQueriesOrReject', () => {
  // Older or hand-authored archives may still carry queries; cast past the type that no
  // longer allows them.
  const withQueries = (queries: unknown): Record<string, unknown> => ({
    ...(wiredUpsert as unknown as Record<string, unknown>),
    queries,
  });

  it('rejects a request carrying non-empty significant-event queries', () => {
    expect(() =>
      stripQueriesOrReject('logs', 'pack/streams/logs.json', withQueries([{ id: 'legacy-query' }]))
    ).toThrow(InvalidContentPackError);
    expect(() =>
      stripQueriesOrReject('logs', 'pack/streams/logs.json', withQueries([{ id: 'legacy-query' }]))
    ).toThrow(/significant-event queries/);
  });

  it('rejects a non-array queries value regardless of shape', () => {
    // Real packs serialize queries as an array, but a malformed object/string must still
    // hard-fail rather than be silently stripped, preserving the "never drop detections" guarantee.
    expect(() =>
      stripQueriesOrReject('logs', 'pack/streams/logs.json', withQueries({ id: 'legacy-query' }))
    ).toThrow(InvalidContentPackError);
    expect(() =>
      stripQueriesOrReject('logs', 'pack/streams/logs.json', withQueries('legacy-query'))
    ).toThrow(/significant-event queries/);
  });

  it('strips an empty queries array and yields a valid structural request', () => {
    const cleaned = stripQueriesOrReject('logs', 'pack/streams/logs.json', withQueries([]));

    expect(cleaned).not.toHaveProperty('queries');
    expect(isContentPackStreamRequest(cleaned)).toBe(true);
  });

  it('leaves a request without queries unchanged', () => {
    const cleaned = stripQueriesOrReject(
      'logs',
      'pack/streams/logs.json',
      wiredUpsert as unknown as Record<string, unknown>
    );

    expect(cleaned).not.toHaveProperty('queries');
    expect(isContentPackStreamRequest(cleaned)).toBe(true);
  });
});
