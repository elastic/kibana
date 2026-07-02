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

  // The runner passes the full document and a context object; only `attributes`
  // is read by our backfillFn. Build minimally-typed doc/context stubs rather
  // than casting through `any`.
  const runBackfill = (attributes: BackfillAttributes) => {
    const doc = {
      id: 'pack-id',
      type: 'osquery-pack',
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
    // Both rows share the same migration-run start_date.
    expect(queries[0].start_date).toBe(queries[1].start_date);
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
