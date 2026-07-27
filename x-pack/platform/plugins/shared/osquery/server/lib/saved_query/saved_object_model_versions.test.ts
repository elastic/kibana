/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelDataBackfillChange,
} from '@kbn/core-saved-objects-server';
import {
  packSavedObjectModelVersion3,
  packSavedObjectModelVersion4,
} from './saved_object_model_versions';
import { convertSOQueriesToPack } from '../../routes/pack/utils';

describe('Pack saved object model version 3 forward compatibility', () => {
  const forwardCompatibility = packSavedObjectModelVersion3.schemas?.forwardCompatibility;

  it('exposes a forwardCompatibility schema', () => {
    expect(forwardCompatibility).toBeDefined();
  });

  it('accepts a V3 pack SO with `schedule_type: "rrule"` + `rrule_schedule`', () => {
    const v3Doc = {
      name: 'rrule-pack',
      description: 'pack scheduled by RRULE',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2026-05-01T00:00:00.000Z',
      },
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(v3Doc)).not.toThrow();
  });

  it('accepts a V3 pack SO with `schedule_type: "interval"` + pack-level `interval`', () => {
    const v3Doc = {
      name: 'interval-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'interval',
      interval: 3600,
      queries: [],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(v3Doc)).not.toThrow();
  });

  it('accepts a pack SO with per-query rrule override (no per-query interval)', () => {
    const perQueryRruleDoc = {
      name: 'per-query-rrule-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=DAILY',
            start_date: '2026-05-01T00:00:00.000Z',
          },
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(perQueryRruleDoc)).not.toThrow();
  });

  it('accepts a legacy pack SO without `schedule_type`', () => {
    const legacyDoc = {
      name: 'legacy-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          interval: 60,
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(legacyDoc)).not.toThrow();
  });

  it('accepts `null` for `schedule_type` / `interval` / `rrule_schedule` (mode-transition clear)', () => {
    const transitioningDoc = {
      name: 'transitioning-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: null,
      interval: null,
      rrule_schedule: null,
      queries: [],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(transitioningDoc)).not.toThrow();
  });

  // A pack SO migrated forward to a future model version must still load
  // through this V3 forward-compat schema; unrecognized fields are dropped, not rejected.
  it('accepts a synthetic V4 pack SO with fictitious future root fields', () => {
    const syntheticV4Doc = {
      name: 'forward-compat-pack',
      description: 'pretends to come from a future V4 migration',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2026-05-01T00:00:00.000Z',
      },
      min_osquery_version: '5.10.0',
      snapshot: true,
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          enabled: true,
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(syntheticV4Doc)).not.toThrow();
  });

  // V3's unknowns:'allow' per-query schema passes schedule_id/start_date
  // through on a rollback read rather than stripping them.
  it('passes the V4-minted per-query `schedule_id`/`start_date` through on rollback read', () => {
    const v4StampedDoc = {
      name: 'test-pack-1',
      description: 'A test pack',
      enabled: true,
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2024-01-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'query1',
          query: 'select * from processes;',
          interval: 3600,
          timeout: 300,
          schedule_id: '310db1f6-e680-4471-982a-dfe304b6cf5a',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      ],
    };

    const out = (forwardCompatibility as ObjectType).validate(v4StampedDoc) as {
      queries: Array<Record<string, unknown>>;
    };

    expect(out.queries[0]).toMatchObject({
      id: 'query1',
      query: 'select * from processes;',
      interval: 3600,
      timeout: 300,
      schedule_id: '310db1f6-e680-4471-982a-dfe304b6cf5a',
      start_date: '2024-01-01T00:00:00.000Z',
    });
  });

  it('passes per-query rrule overrides AND schedule_id through on rollback read', () => {
    const v4RruleDoc = {
      name: 'rrule-pack',
      enabled: true,
      queries: [
        {
          id: 'q1',
          query: 'select * from uptime;',
          schedule_type: 'rrule',
          rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
          schedule_id: '00000000-0000-4000-8000-000000000000',
        },
      ],
    };

    const out = (forwardCompatibility as ObjectType).validate(v4RruleDoc) as {
      queries: Array<Record<string, unknown>>;
    };

    expect(out.queries[0]).toMatchObject({
      schedule_type: 'rrule',
      rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
      schedule_id: '00000000-0000-4000-8000-000000000000',
    });
  });
});

describe('Pack saved object model version 4 — schedule_id/start_date/id backfill', () => {
  interface BackfillQuery extends Record<string, unknown> {
    id?: string;
    query?: string;
    interval?: number;
    schedule_id?: string;
    start_date?: string;
  }
  interface BackfillAttributes {
    queries?: BackfillQuery[];
    created_at?: string;
  }

  // Extract the `data_backfill` change's backfillFn from the model version so
  // we exercise the real migration logic, not a re-implementation.
  const dataBackfillChange = packSavedObjectModelVersion4.changes.find(
    (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
  );
  const backfillFn = dataBackfillChange?.backfillFn as SavedObjectModelDataBackfillFn<
    BackfillAttributes,
    BackfillAttributes
  >;

  // The runner passes the full document and a context object. `start_date` is
  // anchored to the pack's OWN stored `attributes.created_at` (deterministic
  // across upgrade paths) — NOT the SO envelope `created_at`, which reflects
  // migration time on the data_backfill path. `envelopeCreatedAt` is exercised
  // only as the secondary fallback. Build minimally-typed doc/context stubs
  // rather than casting through `any`.
  const runBackfill = (
    attributes: BackfillAttributes,
    { id = 'pack-id', envelopeCreatedAt }: { id?: string; envelopeCreatedAt?: string } = {}
  ) => {
    const doc = {
      id,
      type: 'osquery-pack',
      ...(envelopeCreatedAt ? { created_at: envelopeCreatedAt } : {}),
      attributes,
    } as Parameters<typeof backfillFn>[0];
    const context = {} as Parameters<typeof backfillFn>[1];

    return backfillFn(doc, context) as { attributes: BackfillAttributes };
  };

  const queriesOf = (result: { attributes: BackfillAttributes }): BackfillQuery[] =>
    result.attributes.queries ?? [];

  it('registers a single data_backfill change (no mappings_addition for schedule_id)', () => {
    expect(packSavedObjectModelVersion4.changes).toHaveLength(1);
    expect(packSavedObjectModelVersion4.changes[0].type).toBe('data_backfill');
  });

  it('(a) bare legacy row → mints schedule_id, start_date, AND id', () => {
    const result = runBackfill({
      queries: [
        { query: 'SELECT 1', interval: 60 },
        { query: 'SELECT 2', interval: 120 },
      ],
    });

    const queries = queriesOf(result);
    expect(queries).toHaveLength(2);
    queries.forEach((q) => {
      expect(typeof q.schedule_id).toBe('string');
      expect((q.schedule_id as string).length).toBeGreaterThan(0);
      expect(typeof q.start_date).toBe('string');
      expect((q.start_date as string).length).toBeGreaterThan(0);
      expect(typeof q.id).toBe('string');
    });
    // Distinct schedule_ids minted per query.
    expect(queries[0].schedule_id).not.toBe(queries[1].schedule_id);
    // A no-id row's stamped `id` is its array-position key.
    expect(queries[0].id).toBe('0');
    expect(queries[1].id).toBe('1');
    // Both rows share the same default start_date.
    expect(queries[0].start_date).toBe(queries[1].start_date);
  });

  it('(a2) determinism — repeated runs on the same bare doc mint identical schedule_id/start_date', () => {
    // data_backfill runs on the read path too (get/find of an un-reindexed doc),
    // without write-back, so a non-deterministic mint would return different
    // values on every read and across nodes — severing the schedule_id join.
    // The mint must be a pure function of stable per-document inputs.
    const bare: BackfillAttributes = {
      created_at: '2024-03-04T05:06:07.000Z',
      queries: [
        { query: 'SELECT 1', interval: 60 },
        { id: 'named', query: 'SELECT 2', interval: 120 },
      ],
    };

    const first = queriesOf(runBackfill(bare, { id: 'pack-A' }));
    const second = queriesOf(runBackfill(bare, { id: 'pack-A' }));

    // Byte-for-byte identical across invocations.
    expect(first[0].schedule_id).toBe(second[0].schedule_id);
    expect(first[1].schedule_id).toBe(second[1].schedule_id);
    expect(first[0].start_date).toBe(second[0].start_date);

    // start_date is derived from the pack's own `attributes.created_at`
    // (never `new Date()`), so it is stable across every read/upgrade path.
    expect(first[0].start_date).toBe('2024-03-04T05:06:07.000Z');

    // schedule_id is a valid UUID, unique per query, and keyed to the pack id:
    // a different pack id yields a different schedule_id for the same query key.
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(first[0].schedule_id).toMatch(UUID);
    expect(first[0].schedule_id).not.toBe(first[1].schedule_id);

    const otherPack = queriesOf(runBackfill(bare, { id: 'pack-B' }));
    expect(otherPack[0].schedule_id).not.toBe(first[0].schedule_id);
  });

  it('(a3) start_date anchors to attributes.created_at, NOT the migration-time envelope created_at', () => {
    // Regression guard: on the data_backfill (upgrade) path the SO envelope
    // `created_at` is the migration time, not the pack's original creation. If
    // the mint read the envelope, every migration would stamp a fresh,
    // non-deterministic start_date — the drift the SO migration check caught.
    const result = queriesOf(
      runBackfill(
        {
          created_at: '2021-06-01T00:00:00.000Z', // the pack's own stored creation time
          queries: [{ query: 'SELECT 1', interval: 60 }],
        },
        { id: 'pack-A', envelopeCreatedAt: '2026-07-03T13:03:14.611Z' } // migration time
      )
    );

    expect(result[0].start_date).toBe('2021-06-01T00:00:00.000Z');
    expect(result[0].start_date).not.toBe('2026-07-03T13:03:14.611Z');
  });

  it('(a4) start_date falls back to the envelope created_at, then epoch, when the pack stored none', () => {
    const fromEnvelope = queriesOf(
      runBackfill(
        { queries: [{ query: 'SELECT 1', interval: 60 }] },
        { id: 'pack-A', envelopeCreatedAt: '2022-02-02T02:02:02.000Z' }
      )
    );
    expect(fromEnvelope[0].start_date).toBe('2022-02-02T02:02:02.000Z');

    const fromEpoch = queriesOf(
      runBackfill({ queries: [{ query: 'SELECT 1', interval: 60 }] }, { id: 'pack-A' })
    );
    expect(fromEpoch[0].start_date).toBe('1970-01-01T00:00:00.000Z');
  });

  it('(b) idempotency — existing id/schedule_id/start_date preserved byte-for-byte', () => {
    const result = runBackfill({
      queries: [
        {
          id: 'q1',
          query: 'SELECT 1',
          interval: 60,
          schedule_id: 'already-here',
          start_date: '2024-01-01T00:00:00.000Z',
        },
        { query: 'SELECT 2', interval: 120 },
      ],
    });

    const queries = queriesOf(result);
    // Existing values preserved exactly.
    expect(queries[0].id).toBe('q1');
    expect(queries[0].schedule_id).toBe('already-here');
    expect(queries[0].start_date).toBe('2024-01-01T00:00:00.000Z');
    // The bare sibling gets all three minted.
    expect(queries[1].id).toBe('1');
    expect(typeof queries[1].schedule_id).toBe('string');
    expect((queries[1].schedule_id as string).length).toBeGreaterThan(0);
    expect(typeof queries[1].start_date).toBe('string');
  });

  it('(b) only the missing field is minted when a row carries some but not all', () => {
    const result = runBackfill({
      queries: [{ id: 'keep-me', query: 'SELECT 1', interval: 60 }],
    });

    const query = queriesOf(result)[0];
    // `id` preserved; `schedule_id` + `start_date` minted.
    expect(query.id).toBe('keep-me');
    expect(typeof query.schedule_id).toBe('string');
    expect(typeof query.start_date).toBe('string');
  });

  it('preserves all other per-query fields verbatim', () => {
    const result = runBackfill({
      queries: [
        {
          id: 'q1',
          query: 'SELECT 1',
          interval: 60,
          platform: 'linux',
          ecs_mapping: [{ key: 'host.name', value: { field: 'name' } }],
        },
      ],
    });

    const query = queriesOf(result)[0];
    expect(query.id).toBe('q1');
    expect(query.query).toBe('SELECT 1');
    expect(query.interval).toBe(60);
    expect(query.platform).toBe('linux');
    expect(query.ecs_mapping).toEqual([{ key: 'host.name', value: { field: 'name' } }]);
  });

  it('returns the full queries array (data_backfill replaces arrays wholesale)', () => {
    const result = runBackfill({
      queries: [
        { id: 'q1', query: 'SELECT 1' },
        { id: 'q2', query: 'SELECT 2' },
        { id: 'q3', query: 'SELECT 3' },
      ],
    });

    expect(queriesOf(result).map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('is a no-op (empty attribute patch) for a pack with no queries', () => {
    expect(runBackfill({ queries: [] })).toEqual({ attributes: {} });
    expect(runBackfill({})).toEqual({ attributes: {} });
  });

  // packSchemaV1 sanctions `oneOf([recordOf(...), arrayOf(...)])`, and the
  // 10.2.0/10.3.0 migration fixtures use the record shape. A record-shaped
  // `queries` must be minted onto too — not treated as empty.
  describe('record-shaped (object-map) queries', () => {
    // The runner sees a record here; `backfillFn` accepts both shapes.
    // `createdAt` is the pack's OWN stored `attributes.created_at` — the
    // deterministic anchor for start_date (NOT the SO envelope created_at).
    const runRecordBackfill = (
      queries: Record<string, BackfillQuery>,
      { id, createdAt }: { id?: string; createdAt?: string } = {}
    ) =>
      runBackfill(
        {
          queries,
          ...(createdAt ? { created_at: createdAt } : {}),
        } as unknown as BackfillAttributes,
        { id }
      );

    const recordQueriesOf = (result: {
      attributes: BackfillAttributes;
    }): Record<string, BackfillQuery> =>
      (result.attributes.queries as unknown as Record<string, BackfillQuery>) ?? {};

    it('mints schedule_id/start_date/id onto a record-shaped queries map (was a no-op before)', () => {
      const result = runRecordBackfill(
        {
          query_a: { query: 'SELECT 1', interval: 60 },
          query_b: { query: 'SELECT 2', interval: 120 },
        },
        { id: 'pack-rec', createdAt: '2024-02-02T02:02:02.000Z' }
      );

      const queries = recordQueriesOf(result);
      // Same shape it received: still a record, not an array.
      expect(Array.isArray(result.attributes.queries)).toBe(false);
      expect(Object.keys(queries).sort()).toEqual(['query_a', 'query_b']);

      // The map key is the derived id when no explicit id present.
      expect(queries.query_a.id).toBe('query_a');
      expect(queries.query_b.id).toBe('query_b');

      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(queries.query_a.schedule_id).toMatch(UUID);
      expect(queries.query_b.schedule_id).toMatch(UUID);
      expect(queries.query_a.schedule_id).not.toBe(queries.query_b.schedule_id);
      expect(queries.query_a.start_date).toBe('2024-02-02T02:02:02.000Z');
    });

    it('preserves existing values on a record-shaped map byte-for-byte', () => {
      const result = runRecordBackfill({
        keep: {
          id: 'keep',
          query: 'SELECT 1',
          schedule_id: 'already-here',
          start_date: '2024-01-01T00:00:00.000Z',
        },
        fresh: { query: 'SELECT 2' },
      });

      const queries = recordQueriesOf(result);
      expect(queries.keep.schedule_id).toBe('already-here');
      expect(queries.keep.start_date).toBe('2024-01-01T00:00:00.000Z');
      expect(typeof queries.fresh.schedule_id).toBe('string');
      expect((queries.fresh.schedule_id as string).length).toBeGreaterThan(0);
    });

    it('is a no-op (empty attribute patch) for an empty record-shaped queries map', () => {
      expect(runRecordBackfill({})).toEqual({ attributes: {} });
    });
  });

  // Degenerate import/direct-ES shape: `[{no id}, {id:'0'}]` both derive
  // effectiveKey '0'. V4 would otherwise stamp two rows the same id/schedule_id.
  it('(B4) disambiguates a derived-key collision so no two rows share an id/schedule_id', () => {
    const result = runBackfill({
      queries: [
        { query: 'SELECT 1', interval: 60 },
        { id: '0', query: 'SELECT 2', interval: 120 },
      ],
    });

    const queries = queriesOf(result);
    expect(queries).toHaveLength(2);
    // Distinct durable ids.
    expect(queries[0].id).not.toBe(queries[1].id);
    // Distinct schedule_ids (the whole point of the guard).
    expect(queries[0].schedule_id).not.toBe(queries[1].schedule_id);
    expect(typeof queries[0].schedule_id).toBe('string');
    expect(typeof queries[1].schedule_id).toBe('string');
  });

  // The collision guard's disambiguator (usedKeys) must be DETERMINISTIC: since
  // data_backfill re-runs on the read path without write-back, two runs on the
  // same colliding input must derive byte-identical ids/schedule_ids, or the
  // schedule_id history join is severed on every read.
  it('(B4) collision guard is deterministic across repeated runs on the same input', () => {
    const colliding: BackfillAttributes = {
      queries: [
        { query: 'SELECT 1' }, // no id → derives effectiveKey '0'
        { id: '0', query: 'SELECT 2' }, // explicit id '0' → collides
      ],
    };

    const first = queriesOf(runBackfill(colliding, { id: 'pack-collide' }));
    const second = queriesOf(runBackfill(colliding, { id: 'pack-collide' }));

    // Byte-for-byte identical across runs for the colliding second row.
    expect(first[1].id).toBe(second[1].id);
    expect(first[1].schedule_id).toBe(second[1].schedule_id);
    // ...and the first row too.
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].schedule_id).toBe(second[0].schedule_id);

    // Within a single run the two colliding rows still get DISTINCT durable
    // identities (the whole point of the guard).
    expect(first[0].id).not.toBe(first[1].id);
    expect(first[0].schedule_id).not.toBe(first[1].schedule_id);
  });

  // An empty-string schedule_id is malformed, not a real durable identity. V4
  // treats '' as ABSENT and mints a fresh deterministic UUIDv5 rather than
  // persisting the empty value onto the doc.
  it('mints a fresh UUID for an empty-string schedule_id (treated as absent)', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const result = runBackfill({
      queries: [{ query: 'SELECT 1', schedule_id: '' }],
    });

    const query = queriesOf(result)[0];
    // The empty string is healed, not persisted.
    expect(query.schedule_id).not.toBe('');
    expect(typeof query.schedule_id).toBe('string');
    expect(query.schedule_id).toMatch(UUID);
  });

  it('mints a fresh UUID for an empty-string schedule_id on a record-shaped map', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const result = runBackfill({
      queries: { q_empty: { query: 'SELECT 1', schedule_id: '' } },
    } as unknown as BackfillAttributes);

    const query = (result.attributes.queries as unknown as Record<string, BackfillQuery>).q_empty;
    expect(query.schedule_id).not.toBe('');
    expect(query.schedule_id).toMatch(UUID);
  });

  it('(B4) does not disturb the non-colliding common case', () => {
    const result = runBackfill({
      queries: [
        { id: 'a', query: 'SELECT 1' },
        { id: 'b', query: 'SELECT 2' },
      ],
    });

    const queries = queriesOf(result);
    expect(queries[0].id).toBe('a');
    expect(queries[1].id).toBe('b');
  });

  it('parity — stamped `id` equals the key the GET/wire path derives for no-id rows', () => {
    // keyBy(queries, 'id') must agree with the GET-path key or the minted schedule_id gets dropped.
    const bareQueries = [
      { query: 'SELECT 1', interval: 60 },
      { query: 'SELECT 2', interval: 120 },
    ];

    const stampedIds = queriesOf(runBackfill({ queries: [...bareQueries] })).map((q) => q.id);
    // `convertSOQueriesToPack` keys the record by the derived key for each row.
    const readPathKeys = Object.keys(
      convertSOQueriesToPack(bareQueries.map((q) => ({ ...q, id: undefined })) as never)
    );

    expect(stampedIds).toEqual(readPathKeys);
  });

  it('(d) backfills regardless of feature-flag state (no flag input exists)', () => {
    expect(backfillFn.length).toBeLessThanOrEqual(2); // (document, context) only
    const result = runBackfill({ queries: [{ id: 'q1', query: 'SELECT 1' }] });
    expect(typeof queriesOf(result)[0].schedule_id).toBe('string');
  });

  it('(e) forward-compat — a rolled-back node reads a V4-migrated doc without throwing', () => {
    const forwardCompatibility = packSavedObjectModelVersion4.schemas?.forwardCompatibility;
    expect(forwardCompatibility).toBeDefined();

    const migratedDoc = {
      name: 'migrated-pack',
      enabled: true,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-05-01T00:00:00.000Z',
      updated_by: 'elastic',
      queries: [
        {
          id: 'q1',
          query: 'SELECT * FROM users;',
          interval: 60,
          schedule_id: '11111111-1111-1111-1111-111111111111',
        },
      ],
    };

    expect(() => (forwardCompatibility as ObjectType).validate(migratedDoc)).not.toThrow();
  });
});
