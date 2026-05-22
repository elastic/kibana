/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertSOQueriesToPack,
  convertSOQueriesToPackConfig,
  convertPackQueriesToSO,
  validatePackScheduleFields,
  validateRruleConfig,
  isValidRfc3339,
  resolvePackScheduleForUpdate,
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
    query: `select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !='0' limit 1000;`,
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

  describe('convertSOQueriesToPackConfig (legacy / no packSchedule)', () => {
    test('converts to pack with converting query to single line', () => {
      const { queries } = convertSOQueriesToPackConfig(getTestQueries());
      expect(queries).toStrictEqual(getOneLiner({}));
    });

    test('snapshot true / removed true → result type omitted from output', () => {
      const { queries } = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: true, removed: true })
      );
      expect(queries).toStrictEqual(getOneLiner({}));
    });
    test('converts with results snapshot set false', () => {
      const { queries } = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: false, removed: true })
      );
      expect(queries).toStrictEqual(getOneLiner({ snapshot: false, removed: true }));
    });

    test('passes through schedule_id and start_date', () => {
      const { queries } = convertSOQueriesToPackConfig(
        getTestQueries({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
      expect(queries).toStrictEqual(
        getOneLiner({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
    });

    test('injects space_id at the pack level (not per-query) via default_space_id', () => {
      const output = convertSOQueriesToPackConfig(getTestQueries(), { spaceId: 'my-space' });
      expect(output.default_space_id).toBe('my-space');
      expect(output.queries).toStrictEqual(getOneLiner({}));
    });
  });

  // 3.1.5 — fan-out behavior under the new signature + wire-boundary gate.
  describe('convertSOQueriesToPackConfig — fan-out (PR C)', () => {
    const rrule = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    test('pack RRULE inherited by all queries — pack-level default emitted, no per-query rrule', () => {
      const out = convertSOQueriesToPackConfig(
        [{ id: 'q1', name: 'q1', query: 'SELECT 1', schedule_id: 'sid-1' }],
        {
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: true,
        }
      );
      expect(out.default_rrule_schedule).toEqual(rrule);
      expect(out.queries.q1).not.toHaveProperty('rrule_schedule');
      expect(out.queries.q1).not.toHaveProperty('interval');
      expect(out.queries.q1.schedule_id).toBe('sid-1');
    });

    test('per-query RRULE override (same mode) — both pack default and per-query rrule emitted', () => {
      const overrideRrule = {
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
        start_date: '2024-01-01T00:00:00.000Z',
      };
      const out = convertSOQueriesToPackConfig(
        [
          { id: 'q1', name: 'q1', query: 'SELECT 1' },
          {
            id: 'q2',
            name: 'q2',
            query: 'SELECT 2',
            schedule_type: 'rrule',
            rrule_schedule: overrideRrule,
          },
        ],
        {
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: true,
        }
      );
      expect(out.default_rrule_schedule).toEqual(rrule);
      expect(out.queries.q1).not.toHaveProperty('rrule_schedule');
      expect(out.queries.q2.rrule_schedule).toEqual(overrideRrule);
    });

    test('pack interval inherited — pack-level default_native_schedule emitted, no per-query interval when matching', () => {
      const out = convertSOQueriesToPackConfig(
        [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
        {
          packSchedule: { schedule_type: 'interval', interval: 60 },
          isRruleFeatureEnabled: true,
        }
      );
      expect(out.default_native_schedule).toEqual({ interval: 60 });
      expect(out.queries.q1).not.toHaveProperty('interval');
    });

    test('per-query interval override (same mode, different value) — emitted on the query', () => {
      const out = convertSOQueriesToPackConfig(
        [
          { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 },
          { id: 'q2', name: 'q2', query: 'SELECT 2', interval: 120 },
        ],
        {
          packSchedule: { schedule_type: 'interval', interval: 60 },
          isRruleFeatureEnabled: true,
        }
      );
      expect(out.default_native_schedule).toEqual({ interval: 60 });
      expect(out.queries.q1).not.toHaveProperty('interval');
      expect(out.queries.q2.interval).toBe(120);
    });

    test('legacy pack (no schedule_type) — per-query interval only, no default_*_schedule', () => {
      const out = convertSOQueriesToPackConfig(
        [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
        { isRruleFeatureEnabled: true }
      );
      expect(out.default_rrule_schedule).toBeUndefined();
      expect(out.default_native_schedule).toBeUndefined();
      expect(out.queries.q1.interval).toBe(60);
    });

    test('mode invariant — no query in output carries both interval and rrule_schedule', () => {
      const out = convertSOQueriesToPackConfig(
        [
          {
            id: 'q1',
            name: 'q1',
            query: 'SELECT 1',
            // Stale interval on the SO — must be stripped when pack is rrule.
            interval: 999,
          },
        ],
        {
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: true,
        }
      );
      expect(out.queries.q1).not.toHaveProperty('interval');
      expect(out.queries.q1).not.toHaveProperty('rrule_schedule');
    });

    test('wire-gate off (D25) — RRULE on SO is ignored, legacy interval emission', () => {
      const out = convertSOQueriesToPackConfig(
        [
          { id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 },
          {
            id: 'q2',
            name: 'q2',
            query: 'SELECT 2',
            schedule_type: 'rrule',
            rrule_schedule: rrule,
            interval: 120,
          },
        ],
        {
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: false,
        }
      );
      expect(out.default_rrule_schedule).toBeUndefined();
      expect(out.default_native_schedule).toBeUndefined();
      expect(out.queries.q1.interval).toBe(60);
      // q2 has rrule on the SO but the wire gate strips it; falls back to its
      // interval if present.
      expect(out.queries.q2).not.toHaveProperty('rrule_schedule');
      expect(out.queries.q2.interval).toBe(120);
    });

    test('default_space_id continues to emit when the wire gate is off', () => {
      const out = convertSOQueriesToPackConfig(
        [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
        {
          spaceId: 'my-space',
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: false,
        }
      );
      expect(out.default_space_id).toBe('my-space');
    });

    // 3.2.16 — wire-gate is the actual enforcement boundary, not just the
    // request gate. A pack SO planted with RRULE state still produces the
    // legacy shape when the flag is off.
    test('defense in depth: pack SO carries rrule + flag off → legacy wire shape', () => {
      const out = convertSOQueriesToPackConfig(
        [
          {
            id: 'q1',
            name: 'q1',
            query: 'SELECT 1',
            schedule_type: 'rrule',
            rrule_schedule: rrule,
          },
        ],
        {
          packSchedule: { schedule_type: 'rrule', rrule_schedule: rrule },
          isRruleFeatureEnabled: false,
        }
      );
      expect(out.default_rrule_schedule).toBeUndefined();
      expect(out.queries.q1).not.toHaveProperty('rrule_schedule');
    });
  });

  // 3.2.17 — wire-format byte contract against a beats #48767 fixture.
  describe('convertSOQueriesToPackConfig — beats wire-format byte contract', () => {
    test('default_rrule_schedule matches the beats RRuleScheduleConfig shape byte-for-byte', () => {
      // Fixture lifted from `elastic/beats#48767/internal/config/osquery.go`
      // — the JSON tags on `RRuleScheduleConfig`. If beats ever renames a
      // field or changes a type, this assertion fails and the breakage is
      // caught at PR review rather than at agent runtime.
      const fixture = {
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        splay: '5m',
        timeout: 90,
      };
      const out = convertSOQueriesToPackConfig([{ id: 'q1', name: 'q1', query: 'SELECT 1' }], {
        packSchedule: { schedule_type: 'rrule', rrule_schedule: fixture },
        isRruleFeatureEnabled: true,
      });
      expect(out.default_rrule_schedule).toEqual(fixture);
      // Key set check — no extra fields, no missing fields.
      expect(Object.keys(out.default_rrule_schedule!).sort()).toEqual([
        'end_date',
        'rrule',
        'splay',
        'start_date',
        'timeout',
      ]);
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

    // Verifies the "inert under flag-off" claim of PR A: every existing pack
    // write predates PR C wiring the new routes, so `schedule_type` is always
    // undefined on input. The default-pick path MUST produce byte-identical
    // output to its pre-PR-A shape.
    describe('byte-identical default pick-list (no schedule_type on input)', () => {
      test('emits the canonical pre-PR-A pick-list shape', () => {
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

    describe('per-query schedule_type override (PR C will exercise this)', () => {
      test('schedule_type:"rrule" drops interval, keeps rrule_schedule', () => {
        const result = convertPackQueriesToSO({
          q1: {
            query: 'SELECT 1;',
            interval: 60,
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
          },
        });
        expect(result[0]).not.toHaveProperty('interval');
        expect(result[0]).toMatchObject({
          schedule_type: 'rrule',
          rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-05-01T00:00:00.000Z' },
        });
      });

      test('schedule_type:"interval" keeps interval, stamps schedule_type', () => {
        const result = convertPackQueriesToSO({
          q1: {
            query: 'SELECT 1;',
            interval: 60,
            schedule_type: 'interval',
          },
        });
        expect(result[0]).toMatchObject({
          interval: 60,
          schedule_type: 'interval',
        });
        expect(result[0]).not.toHaveProperty('rrule_schedule');
      });
    });

    // 3.2.14 — defense in depth: query carries rrule_schedule without
    // schedule_type. Route validator rejects earlier; here we ensure the
    // utility drops the field so no RRULE state lands on the SO without
    // its discriminator.
    describe('defense in depth (3.2.14)', () => {
      test('drops rrule_schedule when schedule_type is missing', () => {
        const result = convertPackQueriesToSO({
          q1: {
            query: 'SELECT 1;',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2026-05-01T00:00:00.000Z',
            },
          } as never,
        });
        expect(result[0]).not.toHaveProperty('rrule_schedule');
        expect(result[0]).not.toHaveProperty('schedule_type');
      });
    });
  });

  describe('isValidRfc3339 (D15)', () => {
    test('rejects loose dates', () => {
      expect(isValidRfc3339('2024-01-01')).toBe(false);
      expect(isValidRfc3339('01/02/2024')).toBe(false);
      expect(isValidRfc3339('2024-01-01T00:00:00')).toBe(false); // missing TZ
    });
    test('accepts RFC 3339 with Z', () => {
      expect(isValidRfc3339('2024-01-01T00:00:00Z')).toBe(true);
      expect(isValidRfc3339('2024-01-01T00:00:00.000Z')).toBe(true);
    });
    test('accepts RFC 3339 with explicit offset', () => {
      expect(isValidRfc3339('2024-01-01T00:00:00+02:00')).toBe(true);
      expect(isValidRfc3339('2024-01-01T00:00:00-05:00')).toBe(true);
    });
    test('rejects non-strings and obviously-invalid forms', () => {
      expect(isValidRfc3339(undefined)).toBe(false);
      expect(isValidRfc3339(42 as never)).toBe(false);
      expect(isValidRfc3339('garbage')).toBe(false);
    });
  });

  describe('validateRruleConfig', () => {
    const start = '2024-01-01T00:00:00.000Z';

    test('accepts a valid daily RRULE', () => {
      expect(validateRruleConfig({ rrule: 'FREQ=DAILY', start_date: start })).toBeNull();
    });

    test('D24: rejects unparseable rrule', () => {
      expect(validateRruleConfig({ rrule: 'garbage', start_date: start })).toMatch(
        /rrule_schedule\.rrule is invalid/
      );
    });

    test('D24: rejects missing FREQ', () => {
      expect(validateRruleConfig({ rrule: 'BYDAY=MO,WE', start_date: start })).toMatch(
        /rrule_schedule\.rrule is invalid/
      );
    });

    test('D24: rejects FREQ=BANANA', () => {
      expect(validateRruleConfig({ rrule: 'FREQ=BANANA', start_date: start })).toMatch(
        /rrule_schedule\.rrule is invalid/
      );
    });

    test('D15: rejects loose start_date', () => {
      expect(validateRruleConfig({ rrule: 'FREQ=DAILY', start_date: '2024-01-01' })).toMatch(
        /start_date must be an RFC 3339/
      );
    });

    test('D15: rejects loose end_date', () => {
      expect(
        validateRruleConfig({
          rrule: 'FREQ=DAILY',
          start_date: start,
          end_date: '2024-12-31',
        })
      ).toMatch(/end_date must be an RFC 3339/);
    });

    test('rejects end_date before start_date', () => {
      expect(
        validateRruleConfig({
          rrule: 'FREQ=DAILY',
          start_date: '2024-12-31T00:00:00Z',
          end_date: '2024-01-01T00:00:00Z',
        })
      ).toMatch(/end_date must be after/);
    });

    test('D12: rejects splay > 12h', () => {
      expect(validateRruleConfig({ rrule: 'FREQ=DAILY', start_date: start, splay: '13h' })).toMatch(
        /must not exceed 43200/
      );
    });

    test('D12: accepts splay at the 12h boundary', () => {
      expect(
        validateRruleConfig({ rrule: 'FREQ=DAILY', start_date: start, splay: '12h' })
      ).toBeNull();
    });

    test('3.2.11: rejects oversized rrule string', () => {
      const huge = 'FREQ=DAILY;' + 'X'.repeat(2500);
      expect(validateRruleConfig({ rrule: huge, start_date: start })).toMatch(
        /must not exceed 2048/
      );
    });

    test('D26: rejects splay exceeding half the recurrence period', () => {
      expect(
        validateRruleConfig(
          { rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: start, splay: '2m' },
          120
        )
      ).toMatch(/half of minimum interval 2m0s/);
    });

    test('D26: rejects splay just over the half-period boundary (61s on 120s period)', () => {
      expect(
        validateRruleConfig(
          { rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: start, splay: '61s' },
          120
        )
      ).toMatch(/half of minimum interval/);
    });

    test('D26: accepts splay at exactly the half-period boundary (60s on 120s period)', () => {
      expect(
        validateRruleConfig(
          { rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: start, splay: '60s' },
          120
        )
      ).toBeNull();
    });

    test('D26: accepts splay of 1m on 2m period', () => {
      expect(
        validateRruleConfig(
          { rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: start, splay: '1m' },
          120
        )
      ).toBeNull();
    });

    test('D26: absent recurrenceSeconds skips the half-period check', () => {
      expect(
        validateRruleConfig({ rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: start, splay: '2m' })
      ).toBeNull();
    });

    test('D12 wins over D26: 13h splay on YEARLY returns cap message, not period message', () => {
      expect(
        validateRruleConfig({ rrule: 'FREQ=YEARLY', start_date: start, splay: '13h' }, 28 * 86400)
      ).toMatch(/must not exceed 43200/);
    });

    test('D26: compound splay "1h30m" rejected on HOURLY (5400 * 2 > 3600)', () => {
      expect(
        validateRruleConfig({ rrule: 'FREQ=HOURLY', start_date: start, splay: '1h30m' }, 3600)
      ).toMatch(/half of minimum interval/);
    });

    test('D26: compound splay "1h30m" accepted on HOURLY;INTERVAL=4 (5400 * 2 <= 14400)', () => {
      expect(
        validateRruleConfig(
          { rrule: 'FREQ=HOURLY;INTERVAL=4', start_date: start, splay: '1h30m' },
          14400
        )
      ).toBeNull();
    });
  });

  describe('validatePackScheduleFields', () => {
    const rrule = { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' };

    test('rejects pack with both interval and rrule_schedule', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packInterval: 60,
          packRrule: rrule,
        })
      ).toMatch(/cannot specify both/);
    });

    test('rejects schedule_type: rrule without rrule_schedule', () => {
      expect(validatePackScheduleFields({ packScheduleType: 'rrule' })).toMatch(
        /requires rrule_schedule/
      );
    });

    test('rejects schedule_type: interval without interval', () => {
      expect(validatePackScheduleFields({ packScheduleType: 'interval' })).toMatch(
        /requires pack-level interval/
      );
    });

    test('rejects rrule_schedule without schedule_type', () => {
      expect(validatePackScheduleFields({ packRrule: rrule })).toMatch(/requires schedule_type/);
    });

    test('D11: rejects per-query cross-mode override', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: rrule,
          queries: { q1: { schedule_type: 'interval', interval: 60 } },
        })
      ).toMatch(/does not match pack schedule_type/);
    });

    test('D11: rejects per-query interval when pack is rrule', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: rrule,
          queries: { q1: { interval: 60 } },
        })
      ).toMatch(/must use the same mode/);
    });

    test('D11: rejects per-query rrule_schedule when pack is interval', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'interval',
          packInterval: 60,
          queries: { q1: { rrule_schedule: rrule } },
        })
      ).toMatch(/must use the same mode/);
    });

    test('D11: accepts same-mode override (rrule + rrule)', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: rrule,
          queries: {
            q1: {
              schedule_type: 'rrule',
              rrule_schedule: { rrule: 'FREQ=WEEKLY;BYDAY=MO', start_date: rrule.start_date },
            },
          },
        })
      ).toBeNull();
    });

    test('legacy pack (no schedule_type) — per-query interval still accepted', () => {
      expect(
        validatePackScheduleFields({
          queries: { q1: { interval: 60 } },
        })
      ).toBeNull();
    });

    test('D26: field-probe scenario — pack FREQ=MINUTELY;INTERVAL=2 + splay 2m rejected', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: {
            rrule: 'FREQ=MINUTELY;INTERVAL=2',
            start_date: '2024-01-01T00:00:00.000Z',
            splay: '2m',
          },
        })
      ).toMatch(/half of minimum interval 2m0s/);
    });

    test('D26: field-probe scenario — same pack with splay 1m accepted', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: {
            rrule: 'FREQ=MINUTELY;INTERVAL=2',
            start_date: '2024-01-01T00:00:00.000Z',
            splay: '1m',
          },
        })
      ).toBeNull();
    });

    test('D26: per-query RRULE validated against query period (HOURLY;INTERVAL=2 + splay 2h)', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' },
          queries: {
            q1: {
              schedule_type: 'rrule',
              rrule_schedule: {
                rrule: 'FREQ=HOURLY;INTERVAL=2',
                start_date: '2024-01-01T00:00:00.000Z',
                splay: '2h',
              },
            },
          },
        })
      ).toMatch(/Query "q1": rrule_schedule\.splay must be at most/);
    });

    test('D26: per-query override with own RRULE uses query period not pack period', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' },
          queries: {
            q1: {
              schedule_type: 'rrule',
              rrule_schedule: {
                rrule: 'FREQ=HOURLY;INTERVAL=2',
                start_date: '2024-01-01T00:00:00.000Z',
                splay: '1h',
              },
            },
          },
        })
      ).toBeNull();
    });

    test('D26: per-query override inherits pack period when own RRULE parse fails', () => {
      expect(
        validatePackScheduleFields({
          packScheduleType: 'rrule',
          packRrule: {
            rrule: 'FREQ=MINUTELY;INTERVAL=2',
            start_date: '2024-01-01T00:00:00.000Z',
          },
          queries: {
            q1: {
              schedule_type: 'rrule',
              rrule_schedule: {
                rrule: 'FREQ=MINUTELY;INTERVAL=2',
                start_date: '2024-01-01T00:00:00.000Z',
                splay: '2m',
              },
            },
          },
        })
      ).toMatch(/Query "q1": rrule_schedule\.splay must be at most/);
    });
  });

  describe('resolvePackScheduleForUpdate', () => {
    const rrule = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };

    test('flag off — returns current values verbatim, transitioned: false', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: 'rrule',
          interval: null,
          rrule_schedule: rrule,
          scheduleTypePresent: true,
          intervalPresent: false,
          rruleSchedulePresent: true,
        },
        isRruleFeatureEnabled: false,
      });
      expect(result).toEqual({
        scheduleType: 'interval',
        interval: 60,
        rrule_schedule: undefined,
        transitioned: false,
      });
    });

    test('interval → rrule transition: clears interval, sets rrule_schedule, transitioned: true', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: 'rrule',
          interval: undefined,
          rrule_schedule: rrule,
          scheduleTypePresent: true,
          intervalPresent: false,
          rruleSchedulePresent: true,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: 'rrule',
        interval: null,
        rrule_schedule: rrule,
        transitioned: true,
      });
    });

    test('rrule → interval transition: clears rrule_schedule, sets interval, transitioned: true', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'rrule', interval: null, rrule_schedule: rrule },
        request: {
          schedule_type: 'interval',
          interval: 120,
          rrule_schedule: undefined,
          scheduleTypePresent: true,
          intervalPresent: true,
          rruleSchedulePresent: false,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: 'interval',
        interval: 120,
        rrule_schedule: null,
        transitioned: true,
      });
    });

    test('schedule_type: null (clear mode) — both fields null, transitioned: true', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: null,
          interval: undefined,
          rrule_schedule: undefined,
          scheduleTypePresent: true,
          intervalPresent: false,
          rruleSchedulePresent: false,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: undefined,
        interval: null,
        rrule_schedule: null,
        transitioned: true,
      });
    });

    test('partial update with no schedule fields — returns current values, transitioned: false', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: undefined,
          interval: undefined,
          rrule_schedule: undefined,
          scheduleTypePresent: false,
          intervalPresent: false,
          rruleSchedulePresent: false,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: 'interval',
        interval: 60,
        rrule_schedule: undefined,
        transitioned: false,
      });
    });

    test('same-mode interval change — transitioned: false, new interval, rrule_schedule unchanged', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: undefined,
          interval: 120,
          rrule_schedule: undefined,
          scheduleTypePresent: false,
          intervalPresent: true,
          rruleSchedulePresent: false,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: 'interval',
        interval: 120,
        rrule_schedule: undefined,
        transitioned: false,
      });
    });

    test('explicit interval: null in request wins over current value', () => {
      const result = resolvePackScheduleForUpdate({
        current: { schedule_type: 'interval', interval: 60, rrule_schedule: null },
        request: {
          schedule_type: undefined,
          interval: null,
          rrule_schedule: undefined,
          scheduleTypePresent: false,
          intervalPresent: true,
          rruleSchedulePresent: false,
        },
        isRruleFeatureEnabled: true,
      });
      expect(result).toEqual({
        scheduleType: 'interval',
        interval: null,
        rrule_schedule: undefined,
        transitioned: false,
      });
    });
  });
});
