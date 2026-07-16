/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getStreamPrivilegeSource } from './stream_crud';

/** Minimal wired ingest stream definition fixture. */
const makeWiredStream = (name: string): Streams.WiredStream.Definition => ({
  name,
  type: 'wired',
  description: '',
  updated_at: new Date(0).toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date(0).toISOString() },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { inherit: {} },
  },
});

/** Minimal classic ingest stream definition fixture. */
const makeClassicStream = (name: string): Streams.ClassicStream.Definition => ({
  name,
  type: 'classic',
  description: '',
  updated_at: new Date(0).toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date(0).toISOString() },
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
});

/** Minimal query stream definition fixture. */
const makeQueryStream = (name: string, parentSource: string): Streams.QueryStream.Definition => ({
  name,
  type: 'query',
  description: '',
  updated_at: new Date(0).toISOString(),
  query: {
    view: `$.${name}`,
    esql: `FROM ${parentSource} | STATS count = COUNT(*)`,
  },
});

describe('getStreamPrivilegeSource', () => {
  describe('non-query streams authorize against their own name', () => {
    it('returns name for a wired ingest stream', () => {
      const definition = makeWiredStream('logs.nginx');
      expect(getStreamPrivilegeSource(definition)).toBe('logs.nginx');
    });

    it('returns name for a classic ingest stream', () => {
      const definition = makeClassicStream('logs-custom');
      expect(getStreamPrivilegeSource(definition)).toBe('logs-custom');
    });
  });

  describe('query stream child of a wired ingest parent', () => {
    it('returns the immediate parent name without a map (single-level query)', () => {
      const definition = makeQueryStream('logs.secret.query', '$.logs.secret');
      expect(getStreamPrivilegeSource(definition)).toBe('logs.secret');
    });

    it('returns the immediate ingest parent name when the map confirms the parent is wired', () => {
      const parent = makeWiredStream('logs.secret');
      const definition = makeQueryStream('logs.secret.query', '$.logs.secret');
      const map = new Map<string, Streams.all.Definition>([
        ['logs.secret', parent],
        ['logs.secret.query', definition],
      ]);
      expect(getStreamPrivilegeSource(definition, map)).toBe('logs.secret');
    });
  });

  describe('query stream child of a classic ingest parent', () => {
    it('returns the classic parent name without a map', () => {
      const definition = makeQueryStream('logs-classic.enriched', 'logs-classic');
      expect(getStreamPrivilegeSource(definition)).toBe('logs-classic');
    });

    it('returns the classic parent name when the map confirms the parent is classic', () => {
      const parent = makeClassicStream('logs-classic');
      const definition = makeQueryStream('logs-classic.enriched', 'logs-classic');
      const map = new Map<string, Streams.all.Definition>([
        ['logs-classic', parent],
        ['logs-classic.enriched', definition],
      ]);
      expect(getStreamPrivilegeSource(definition, map)).toBe('logs-classic');
    });
  });

  describe('nested query stream (query-under-query) with a map', () => {
    it('walks past an intermediate query-stream parent and returns the nearest ingest ancestor', () => {
      // logs.app (wired ingest) → logs.app.filtered (query) → logs.app.filtered.derived (query)
      const ingestGrandparent = makeWiredStream('logs.app');
      const intermediateQuery = makeQueryStream('logs.app.filtered', '$.logs.app');
      const leafQuery = makeQueryStream('logs.app.filtered.derived', '$.logs.app.filtered');
      const map = new Map<string, Streams.all.Definition>([
        ['logs.app', ingestGrandparent],
        ['logs.app.filtered', intermediateQuery],
        ['logs.app.filtered.derived', leafQuery],
      ]);
      expect(getStreamPrivilegeSource(leafQuery, map)).toBe('logs.app');
    });

    it('falls back to the named ancestor when an intermediate query-stream parent is absent from the map', () => {
      // logs.mid.leaf → parent 'logs.mid' IS a query stream in the map,
      // grandparent 'logs' is a root and NOT in the map (undefined parent).
      // When map.get returns undefined for 'logs', the query-stream guard
      // is skipped (undefined && ... is false) and 'logs' is returned as-is.
      const midQuery = makeQueryStream('logs.mid', '$.logs');
      const leafQuery = makeQueryStream('logs.mid.leaf', '$.logs.mid');
      const map = new Map<string, Streams.all.Definition>([
        ['logs.mid', midQuery],
        ['logs.mid.leaf', leafQuery],
        // 'logs' is intentionally absent — simulates a root not stored in .streams
      ]);
      expect(getStreamPrivilegeSource(leafQuery, map)).toBe('logs');
    });
  });

  describe('returns undefined (fail-closed) when no parent can be derived', () => {
    it('returns undefined for a query stream with a single-segment name (no parent)', () => {
      // getParentId('orphan') returns undefined; the while loop never executes.
      const definition = makeQueryStream('orphan', 'logs.*');
      expect(getStreamPrivilegeSource(definition)).toBeUndefined();
    });
  });
});
