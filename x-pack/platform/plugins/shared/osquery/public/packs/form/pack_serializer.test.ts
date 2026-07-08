/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serializePack,
  packExportFilename,
  downloadPackAsJson,
  DEFAULT_PACK_QUERY_INTERVAL_SECONDS,
} from './pack_serializer';

// URL.revokeObjectURL is absent from jsdom; install a no-op so the deferred
// revocation in downloadPackAsJson doesn't throw. (createObjectURL exists but
// is non-configurable, so we don't touch it — see the download test note.)
if (typeof URL.revokeObjectURL !== 'function') {
  (URL as unknown as Record<string, unknown>).revokeObjectURL = jest.fn();
}

/**
 * The public packs API shape the Packs table actually holds (verified at
 * runtime): `queries` is an ARRAY, the query name lives in `id`, `ecs_mapping`
 * is an ARRAY of `{ key, value }`, and cluster-internal fields (schedule_id,
 * start_date, policy_ids, shards) ride along. This is the primary fixture — the
 * exporter must read exactly this and drop the cluster-specific fields.
 */
const buildApiPack = (overrides: Record<string, unknown> = {}) =>
  ({
    saved_object_id: 'so-id-1',
    name: 'my-pack',
    description: 'a pack',
    enabled: true,
    created_at: '2026-07-07T00:00:00.000Z',
    created_by: 'elastic',
    updated_at: '2026-07-07T00:00:00.000Z',
    updated_by: 'elastic',
    policy_ids: ['policy-1'],
    shards: [],
    queries: [
      {
        id: 'processes_elastic',
        query: 'SELECT  *   FROM processes;',
        interval: 60,
        platform: 'linux',
        ecs_mapping: [{ key: 'process.pid', value: { field: 'pid' } }],
        schedule_id: 'sched-abc',
        start_date: '2026-07-07T00:00:00.000Z',
      },
    ],
    ...overrides,
  } as any);

describe('pack_serializer', () => {
  describe('serializePack — pack metadata', () => {
    it('emits the pack name and description', () => {
      const exported = serializePack(buildApiPack());
      expect(exported.name).toBe('my-pack');
      expect(exported.description).toBe('a pack');
    });

    it('omits description when absent', () => {
      const exported = serializePack(buildApiPack({ description: undefined }));
      expect(exported).not.toHaveProperty('description');
    });

    it('never emits `enabled` (imported packs land disabled)', () => {
      const exported = serializePack(buildApiPack());
      expect(exported).not.toHaveProperty('enabled');
      expect(JSON.stringify(exported)).not.toContain('enabled');
    });

    it('carries an rrule pack-level schedule when present', () => {
      const rrule = { rrule: 'FREQ=DAILY', start_date: '2026-07-07T00:00:00.000Z' };
      const exported = serializePack(
        buildApiPack({ schedule_type: 'rrule', rrule_schedule: rrule })
      );
      expect(exported.schedule_type).toBe('rrule');
      expect(exported.rrule_schedule).toEqual(rrule);
      expect(exported).not.toHaveProperty('interval');
    });

    it('carries an interval pack-level schedule when present', () => {
      const exported = serializePack(buildApiPack({ schedule_type: 'interval', interval: 900 }));
      expect(exported.schedule_type).toBe('interval');
      expect(exported.interval).toBe(900);
      expect(exported).not.toHaveProperty('rrule_schedule');
    });

    it('omits pack-level schedule when the pack has none', () => {
      const exported = serializePack(buildApiPack());
      expect(exported).not.toHaveProperty('schedule_type');
      expect(exported).not.toHaveProperty('rrule_schedule');
      expect(exported).not.toHaveProperty('interval');
    });

    it('drops cluster-specific and saved-object fields', () => {
      const serialized = JSON.stringify(serializePack(buildApiPack()));
      [
        'saved_object_id',
        'policy_ids',
        'shards',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
        'schedule_id',
        'start_date',
        // top-level keys only: name/description/queries.
      ].forEach((field) => {
        expect(serialized).not.toContain(field);
      });
      expect(Object.keys(serializePack(buildApiPack())).sort()).toEqual([
        'description',
        'name',
        'queries',
      ]);
    });
  });

  describe('serializePack — queries (public-API array shape)', () => {
    it('keys queries by the query NAME (from id), not the array index', () => {
      const exported = serializePack(buildApiPack());
      expect(Object.keys(exported.queries)).toEqual(['processes_elastic']);
      // Query text is copied VERBATIM on export — internal whitespace is not
      // collapsed. The uploader reviver preserves it on the way back in, so the
      // multi-space SQL is a fixed point across export→import (round-trip proven
      // end-to-end in queries_field.test.tsx).
      expect(exported.queries.processes_elastic.query).toBe('SELECT  *   FROM processes;');
    });

    it('emits interval as a number', () => {
      const exported = serializePack(buildApiPack());
      expect(exported.queries.processes_elastic.interval).toBe(60);
      expect(typeof exported.queries.processes_elastic.interval).toBe('number');
    });

    it('converts ecs_mapping array back to the osquery object form', () => {
      const exported = serializePack(buildApiPack());
      expect(exported.queries.processes_elastic.ecs_mapping).toEqual({
        'process.pid': { field: 'pid' },
      });
    });

    it('carries timeout, snapshot, and removed when present', () => {
      const exported = serializePack(
        buildApiPack({
          queries: [
            {
              id: 'q',
              query: 'SELECT 1;',
              interval: 30,
              timeout: 120,
              snapshot: false,
              removed: true,
            },
          ],
        })
      );
      expect(exported.queries.q).toMatchObject({ timeout: 120, snapshot: false, removed: true });
    });

    it('omits platform, version, and ecs_mapping when absent', () => {
      const exported = serializePack(
        buildApiPack({ queries: [{ id: 'minimal', query: 'SELECT 1;', interval: 30 }] })
      );
      expect(exported.queries.minimal).toEqual({ query: 'SELECT 1;', interval: 30 });
    });

    it('omits an empty ecs_mapping array', () => {
      const exported = serializePack(
        buildApiPack({ queries: [{ id: 'q', query: 'SELECT 1;', interval: 30, ecs_mapping: [] }] })
      );
      expect(exported.queries.q).not.toHaveProperty('ecs_mapping');
    });

    it('serializes every query in a multi-query pack', () => {
      const exported = serializePack(
        buildApiPack({
          queries: [
            { id: 'a', query: 'SELECT 1;', interval: 10 },
            { id: 'b', query: 'SELECT 2;', interval: 20 },
          ],
        })
      );
      expect(Object.keys(exported.queries)).toEqual(['a', 'b']);
    });

    it('preserves internal query whitespace verbatim (no collapsing on export)', () => {
      const exported = serializePack(
        buildApiPack({
          queries: [{ id: 'ws', query: 'SELECT   a,    b   FROM   t;', interval: 30 }],
        })
      );
      expect(exported.queries.ws.query).toBe('SELECT   a,    b   FROM   t;');
    });

    it('falls back to the default interval when a query interval is unparsable', () => {
      const exported = serializePack(
        buildApiPack({ queries: [{ id: 'q', query: 'SELECT 1;', interval: 'not-a-number' }] })
      );
      expect(exported.queries.q.interval).toBe(DEFAULT_PACK_QUERY_INTERVAL_SECONDS);
    });
  });

  describe('serializePack — empty / zero-query packs', () => {
    it('returns an empty queries object for the array form (queries: [])', () => {
      const exported = serializePack(buildApiPack({ queries: [] }));
      expect(exported.queries).toEqual({});
      expect(exported.name).toBe('my-pack');
    });

    it('returns an empty queries object for the object form (queries: {})', () => {
      const exported = serializePack({ name: 'empty', queries: {} });
      expect(exported).toEqual({ name: 'empty', queries: {} });
    });
  });

  describe('serializePack — name-keyed object fallback', () => {
    it('handles the saved-object object shape with object ecs_mapping', () => {
      const exported = serializePack({
        name: 'obj-pack',

        queries: {
          processes: {
            query: 'SELECT * FROM processes;',
            interval: '60',
            platform: 'linux',
            ecs_mapping: { 'process.pid': { field: 'pid' } },
          },
        } as any,
      });
      expect(Object.keys(exported.queries)).toEqual(['processes']);
      expect(exported.queries.processes.interval).toBe(60);
      expect(exported.queries.processes.ecs_mapping).toEqual({ 'process.pid': { field: 'pid' } });
    });
  });

  describe('packExportFilename', () => {
    it('derives a .json filename from the pack name, preserving hyphens', () => {
      expect(packExportFilename('my-pack')).toBe('my-pack.json');
    });

    it('replaces spaces', () => {
      expect(packExportFilename('My Test Pack')).toBe('My_Test_Pack.json');
    });

    it('replaces illegal filesystem characters (trailing separator trimmed)', () => {
      expect(packExportFilename('a/b:c*d?')).toBe('a_b_c_d.json');
    });

    it('handles unicode names without producing an empty filename', () => {
      const result = packExportFilename('パック');
      expect(result.endsWith('.json')).toBe(true);
      expect(result).not.toBe('.json');
    });

    it('falls back for an empty or all-illegal name', () => {
      expect(packExportFilename('')).toBe('pack.json');
      expect(packExportFilename('///')).toBe('pack.json');
    });

    it('prefixes Windows-reserved device names so they are no longer reserved', () => {
      expect(packExportFilename('CON')).toBe('_CON.json');
      expect(packExportFilename('COM1')).toBe('_COM1.json');
      expect(packExportFilename('NUL')).toBe('_NUL.json');
      // Case-insensitive.
      expect(packExportFilename('con')).toBe('_con.json');
      expect(packExportFilename('lpt9')).toBe('_lpt9.json');
    });

    it('does not prefix names that merely start with a reserved token', () => {
      // `console` is not a reserved device name.
      expect(packExportFilename('console')).toBe('console.json');
    });

    it('strips control characters including NUL', () => {
      // NUL (0x00), unit separator (0x1F), and DEL (0x7F) interleaved with text.
      const NUL = String.fromCharCode(0x00);
      const US = String.fromCharCode(0x1f);
      const DEL = String.fromCharCode(0x7f);
      const result = packExportFilename(`a${NUL}b${US}c${DEL}d`);
      // Each control char is replaced with `_`.
      expect(result).toBe('a_b_c_d.json');
      // No raw control char (0x00-0x1F, 0x7F-0x9F) leaks into the filename.
      const hasControlChar = result.split('').some((ch) => {
        const code = ch.charCodeAt(0);

        return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
      });
      expect(hasControlChar).toBe(false);
    });

    it('caps the base length so the final filename stays under the filesystem limit', () => {
      const longName = 'a'.repeat(500);
      const result = packExportFilename(longName);
      const base = result.replace(/\.json$/, '');
      expect(base.length).toBeLessThanOrEqual(200);
      expect(result.endsWith('.json')).toBe(true);
    });
  });

  describe('downloadPackAsJson', () => {
    let clickSpy: jest.Mock;
    let anchor: Partial<HTMLAnchorElement>;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      clickSpy = jest.fn();
      anchor = { href: '', download: '', click: clickSpy };

      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string, options?: ElementCreationOptions) => {
          if (tag === 'a') return anchor as HTMLAnchorElement;

          return originalCreateElement(tag, options);
        });
      jest.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
      jest.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    // URL.createObjectURL is non-configurable in jest jsdom setup, so download
    // behavior is verified through the anchor element, not the URL API (matches
    // results/use_export_results.test.ts).
    it('triggers an anchor download named after the pack (.json)', () => {
      downloadPackAsJson(buildApiPack({ name: 'My Pack' }));

      expect(anchor.download).toBe('My_Pack.json');
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });
});
