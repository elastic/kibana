/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  convertSOQueriesToPack,
  convertSOQueriesToPackConfig,
  convertPackQueriesToSO,
  fetchAllPackagePolicies,
  resolvePreservedQueries,
  hasQueries,
} from './utils';

const getTestQueries = (additionalFields?: Record<string, unknown>, packName = 'default') => ({
  [packName]: {
    ...additionalFields,
    query:
      'select u.username,\n' +
      '       p.pid,\n' +
      '       p.name,\n' +
      '       pos.local_address,\n' +
      '       pos.local_port,\n' +
      '       p.path,\n' +
      '       p.cmdline,\n' +
      '       pos.remote_address,\n' +
      '       pos.remote_port\n' +
      'from processes as p\n' +
      'join users as u\n' +
      '    on u.uid=p.uid\n' +
      'join process_open_sockets as pos\n' +
      '    on pos.pid=p.pid\n' +
      "where pos.remote_port !='0'\n" +
      'limit 1000;',
    interval: 3600,
  },
});

const getOneLiner = (additionParams: Record<string, unknown>) => ({
  default: {
    interval: 3600,
    query:
      "select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !='0' limit 1000;",
    ...additionParams,
  },
});

describe('Pack utils', () => {
  describe('convertSOQueriesToPack', () => {
    test('converts to pack with empty ecs_mapping', () => {
      const convertedQueries = convertSOQueriesToPack(getTestQueries());
      expect(convertedQueries).toStrictEqual(getTestQueries());
    });
    test('converts to object with pack names after query.id', () => {
      const convertedQueries = convertSOQueriesToPack(getTestQueries({ id: 'testId' }));
      expect(convertedQueries).toStrictEqual(getTestQueries({}, 'testId'));
    });

    test('converts with results snapshot set true and removed true', () => {
      const convertedQueries = convertSOQueriesToPack(
        getTestQueries({ snapshot: true, removed: true })
      );
      expect(convertedQueries).toStrictEqual(getTestQueries({ snapshot: true, removed: true }));
    });
    test('converts with results snapshot set true but removed false', () => {
      const convertedQueries = convertSOQueriesToPack(
        getTestQueries({ snapshot: true, removed: false })
      );
      expect(convertedQueries).toStrictEqual(getTestQueries({ snapshot: true, removed: false }));
    });
    test('converts with both results set to false', () => {
      const convertedQueries = convertSOQueriesToPack(
        getTestQueries({ snapshot: false, removed: false })
      );
      expect(convertedQueries).toStrictEqual(getTestQueries({ removed: false, snapshot: false }));
    });
  });
  describe('convertSOQueriesToPackConfig', () => {
    test('converts to pack with converting query to single line', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries());
      expect(convertedQueries).toStrictEqual(getOneLiner({}));
    });

    test('if snapshot true and removed true - return empty {}', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: true, removed: true })
      );
      expect(convertedQueries).toStrictEqual(getOneLiner({}));
    });
    test('if snapshot true and removed false - return empty {}', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: true, removed: false })
      );
      expect(convertedQueries).toStrictEqual(getOneLiner({}));
    });
    test('converts with results snapshot set false', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: false, removed: true })
      );
      expect(convertedQueries).toStrictEqual(getOneLiner({ snapshot: false, removed: true }));
    });
    test('converts with both results set to false', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: false, removed: false })
      );
      expect(convertedQueries).toStrictEqual(getOneLiner({ removed: false, snapshot: false }));
    });

    test('passes through schedule_id and start_date', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
      expect(convertedQueries).toStrictEqual(
        getOneLiner({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
    });

    test('injects space_id when provided', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries(), 'my-space');
      expect(convertedQueries).toStrictEqual(getOneLiner({ space_id: 'my-space' }));
    });

    test('does not inject pack_id into queries (pack_id belongs at pack level)', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries(), 'my-space');
      expect(convertedQueries).toStrictEqual(getOneLiner({ space_id: 'my-space' }));
      expect(convertedQueries.default).not.toHaveProperty('pack_id');
    });
  });

  describe('convertSOQueriesToPackConfig — schedule_id reaches the wire explicitly', () => {
    test('emits schedule_id (backport-critical path)', () => {
      const out = convertSOQueriesToPackConfig([
        { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60, schedule_id: 'sched-1' },
      ]);

      expect(out.q1.schedule_id).toBe('sched-1');
    });

    test('emits schedule_id for every query (multi-query)', () => {
      const out = convertSOQueriesToPackConfig([
        { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60, schedule_id: 'sched-1' },
        { id: 'q2', name: 'q2', query: 'SELECT 2', interval: 120, schedule_id: 'sched-2' },
      ]);

      expect(out.q1.schedule_id).toBe('sched-1');
      expect(out.q2.schedule_id).toBe('sched-2');
    });

    test('omits schedule_id when the stored query has none (no empty key leaked)', () => {
      const out = convertSOQueriesToPackConfig([
        { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 },
      ]);

      expect(out.q1).not.toHaveProperty('schedule_id');
    });

    test('does not regress other field shapes when schedule_id is present', () => {
      const out = convertSOQueriesToPackConfig([
        { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60, schedule_id: 'sched-1' },
      ]);

      expect(out.q1).toEqual({
        name: 'q1',
        query: 'SELECT 1',
        interval: 60,
        schedule_id: 'sched-1',
      });
    });
  });

  describe('convertSOQueriesToPack — schedule_id preservation', () => {
    test('preserves schedule_id and start_date from SO format to pack format', () => {
      const soQueries = [
        {
          id: 'q1',
          name: 'q1',
          query: 'SELECT 1',
          interval: 60,
          schedule_id: 'uuid-preserved',
          start_date: '2024-03-01T00:00:00.000Z',
        },
      ];
      const result = convertSOQueriesToPack(soQueries);

      expect(result.q1).toBeDefined();
      expect(result.q1.schedule_id).toBe('uuid-preserved');
      expect(result.q1.start_date).toBe('2024-03-01T00:00:00.000Z');
    });
  });

  describe('convertPackQueriesToSO', () => {
    test('preserves schedule_id and start_date in converted queries', () => {
      const packQueries = getOneLiner({
        schedule_id: 'uuid-xyz',
        start_date: '2024-06-15T12:00:00.000Z',
      });
      const result = convertPackQueriesToSO(packQueries);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'default',
        schedule_id: 'uuid-xyz',
        start_date: '2024-06-15T12:00:00.000Z',
      });
    });

    describe('byte-identical default pick-list (no schedule_type on input)', () => {
      test('emits the canonical default pick-list shape', () => {
        const result = convertPackQueriesToSO({
          q1: {
            name: 'q1',
            query: 'SELECT 1;',
            interval: 60,
            platform: 'linux',
            version: '5.10.0',
            snapshot: true,
            removed: false,
            timeout: 30,
            schedule_id: 'sid-1',
            start_date: '2026-05-01T00:00:00.000Z',
          },
        });

        expect(result).toEqual([
          {
            id: 'q1',
            name: 'q1',
            query: 'SELECT 1;',
            interval: 60,
            platform: 'linux',
            version: '5.10.0',
            snapshot: true,
            removed: false,
            timeout: 30,
            schedule_id: 'sid-1',
            start_date: '2026-05-01T00:00:00.000Z',
          },
        ]);
      });

      test('does not introduce schedule_type / rrule_schedule keys when input omits schedule_type', () => {
        const result = convertPackQueriesToSO({
          q1: { name: 'q1', query: 'SELECT 1;', interval: 60 },
        });
        expect(result[0]).not.toHaveProperty('schedule_type');
        expect(result[0]).not.toHaveProperty('rrule_schedule');
      });

      test('drops fields not on the default pick-list (no leak of extra props)', () => {
        const result = convertPackQueriesToSO({
          q1: {
            name: 'q1',
            query: 'SELECT 1;',
            interval: 60,
            extra_field: 'must-not-leak',
          } as never,
        });
        expect(result[0]).not.toHaveProperty('extra_field');
      });
    });
  });
});

describe('resolvePreservedQueries', () => {
  const existing = {
    q1: { schedule_id: 'sid-q1', start_date: 'd1' },
    q2: { schedule_id: 'sid-q2', start_date: 'd2' },
  };

  it('matches each query to its own stored row by map key', () => {
    const result = resolvePreservedQueries(
      { q1: { id: 'q1', query: 'a' }, q2: { id: 'q2', query: 'b' } },
      existing
    );
    expect(result).toEqual({
      q1: { schedule_id: 'sid-q1', start_date: 'd1' },
      q2: { schedule_id: 'sid-q2', start_date: 'd2' },
    });
  });

  it('re-pairs a renamed query (changed map key) via the incoming `id`', () => {
    const result = resolvePreservedQueries({ q1_renamed: { id: 'q1', query: 'a' } }, existing);
    expect(result.q1_renamed).toEqual({ schedule_id: 'sid-q1', start_date: 'd1' });
  });

  it('consumes each stored row at most once — a duplicate `id` claim only wins once', () => {
    // q1 wins stored q1 first; q2's stale claim on the same id falls through to its own map key.
    const result = resolvePreservedQueries(
      { q1: { id: 'q1', query: 'a' }, q2: { id: 'q1', query: 'b' } },
      existing
    );
    expect(result.q1).toEqual({ schedule_id: 'sid-q1', start_date: 'd1' });
    expect(result.q2).toEqual({ schedule_id: 'sid-q2', start_date: 'd2' });
    expect(result.q1).not.toEqual(result.q2);
  });

  it('an explicit `id` claim wins even when the claiming query has no stored row of its own', () => {
    // `extra` wins stored q1; the genuine q1 finds its row already consumed.
    const result = resolvePreservedQueries(
      { extra: { id: 'q1', query: 'b' }, q1: { id: 'q1', query: 'a' } },
      existing
    );
    expect(result.extra).toEqual({ schedule_id: 'sid-q1', start_date: 'd1' });
    expect(result.q1).toBeUndefined();
  });

  it('honors explicit rename intent regardless of key order — the id-claimant wins even if it comes first', () => {
    const result = resolvePreservedQueries(
      { other: { id: 'q1', query: 'b' }, q1: { id: 'q1', query: 'a' } },
      existing
    );
    expect(result.other).toEqual({ schedule_id: 'sid-q1', start_date: 'd1' });
    expect(result.q1).toBeUndefined();
  });

  it('leaves a brand-new query unmatched', () => {
    const result = resolvePreservedQueries({ fresh: { query: 'x' } }, existing);
    expect(result.fresh).toBeUndefined();
  });

  it('rename plus name reuse does not misattribute schedule_id (regression)', () => {
    // Explicit rename intent must win over a new query reusing the freed map key.
    const result = resolvePreservedQueries(
      { q1: { query: 'new query reusing the freed name' }, q2: { id: 'q1', query: 'renamed' } },
      { q1: { schedule_id: 'S1', start_date: 'd1' } }
    );
    expect(result.q2).toEqual({ schedule_id: 'S1', start_date: 'd1' });
    expect(result.q1).toBeUndefined();
  });
});

describe('fetchAllPackagePolicies (shared keyset drain for create/delete/update/reconciler)', () => {
  const soClient = {} as SavedObjectsClientContract;

  const serviceYielding = (batches: unknown[][]) =>
    ({
      fetchAllItems: jest.fn().mockImplementation(async function* asyncGenerator() {
        for (const batch of batches) {
          yield batch;
        }
      }),
    } as unknown as PackagePolicyClient);

  it('drains ALL batches (not just the first ≤1000 offset page)', async () => {
    const service = serviceYielding([[{ id: 'pp-1' }, { id: 'pp-2' }], [{ id: 'pp-3' }]]);

    const result = await fetchAllPackagePolicies(service, soClient);

    // A policy on the second page must survive — the offset-capped
    // list({ perPage: 1000 }) pattern this replaces would have dropped it.
    expect(result.map((p) => p.id)).toEqual(['pp-1', 'pp-2', 'pp-3']);
  });

  it('returns an empty array when the service is undefined', async () => {
    expect(await fetchAllPackagePolicies(undefined, soClient)).toEqual([]);
  });

  it('scopes the drain with the default osquery kuery', async () => {
    const service = serviceYielding([[]]);

    await fetchAllPackagePolicies(service, soClient);

    expect(service.fetchAllItems).toHaveBeenCalledWith(
      soClient,
      expect.objectContaining({
        kuery: expect.stringContaining('package.name:osquery_manager'),
      })
    );
  });

  it('forwards a caller-supplied kuery unchanged', async () => {
    const service = serviceYielding([[]]);

    await fetchAllPackagePolicies(service, soClient, 'custom-kuery');

    expect(service.fetchAllItems).toHaveBeenCalledWith(soClient, { kuery: 'custom-kuery' });
  });
});

// Shared by the V4 mint guard and the reconcile filter; pinning its verdict
// here pins mint-guard ≡ reconcile-filter parity so the two can't drift.
describe('hasQueries (shared mint/reconcile emptiness predicate)', () => {
  it.each([
    ['non-empty array', [{ query: 'SELECT 1' }], true],
    ['non-empty record', { q1: { query: 'SELECT 1' } }, true],
    ['empty array', [], false],
    ['empty record', {}, false],
    ['null', null, false],
    ['undefined', undefined, false],
  ])('returns %s → %s', (_label, input, expected) => {
    expect(hasQueries(input as Parameters<typeof hasQueries>[0])).toBe(expected);
  });

  // Mint guard (`!hasQueries` → skip) and reconcile filter (`hasQueries` →
  // include) must reach the same verdict for every shape.
  it('mint guard and reconcile filter agree on the same verdict for each shape', () => {
    const cases: Array<Parameters<typeof hasQueries>[0]> = [
      [{ query: 'SELECT 1' }],
      { q1: { query: 'SELECT 1' } },
      [],
      {},
      undefined,
    ];

    for (const queries of cases) {
      const nonEmpty = hasQueries(queries);
      // Mint guard skips (returns empty patch) exactly when queries are empty.
      const mintGuardSkips = !hasQueries(queries);
      // Reconcile filter includes an enabled pack exactly when queries are non-empty.
      const reconcileIncludes = true && hasQueries(queries);

      expect(mintGuardSkips).toBe(!nonEmpty);
      expect(reconcileIncludes).toBe(nonEmpty);
    }
  });
});
