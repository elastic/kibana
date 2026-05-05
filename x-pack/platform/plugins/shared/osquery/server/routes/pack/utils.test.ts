/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDiscriminatedScheduleResponseFields,
  convertSOQueriesToPack,
  convertSOQueriesToPackConfig,
  convertPackQueriesToSO,
  extractAndValidatePackScheduleFromBody,
  stripScheduleFieldsFromBody,
  validateScheduleFields,
} from './utils';
import type { RRuleScheduleConfig } from '../../../common';

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
  describe('convertSOQueriesToPackConfig', () => {
    test('converts to pack with converting query to single line', () => {
      const result = convertSOQueriesToPackConfig(getTestQueries());
      expect(result.queries).toStrictEqual(getOneLiner({}));
      expect(result).not.toHaveProperty('default_native_schedule');
      expect(result).not.toHaveProperty('default_rrule_schedule');
      expect(result).not.toHaveProperty('default_space_id');
    });

    test('if snapshot true and removed true - return empty {}', () => {
      const result = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: true, removed: true })
      );
      expect(result.queries).toStrictEqual(getOneLiner({}));
    });
    test('if snapshot true and removed false - return empty {}', () => {
      const result = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: true, removed: false })
      );
      expect(result.queries).toStrictEqual(getOneLiner({}));
    });
    test('converts with results snapshot set false', () => {
      const result = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: false, removed: true })
      );
      expect(result.queries).toStrictEqual(getOneLiner({ snapshot: false, removed: true }));
    });
    test('converts with both results set to false', () => {
      const result = convertSOQueriesToPackConfig(
        getTestQueries({ snapshot: false, removed: false })
      );
      expect(result.queries).toStrictEqual(getOneLiner({ removed: false, snapshot: false }));
    });

    test('passes through schedule_id and start_date', () => {
      const result = convertSOQueriesToPackConfig(
        getTestQueries({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
      expect(result.queries).toStrictEqual(
        getOneLiner({ schedule_id: 'uuid-abc', start_date: '2024-01-01T00:00:00.000Z' })
      );
    });

    test('emits default_space_id at pack level instead of stamping space_id per query (D13)', () => {
      const result = convertSOQueriesToPackConfig(getTestQueries(), 'my-space');
      expect(result.default_space_id).toBe('my-space');
      expect(result.queries.default).not.toHaveProperty('space_id');
      expect(result.queries).toStrictEqual(getOneLiner({}));
    });

    test('does not inject pack_id into queries (pack_id belongs at pack level)', () => {
      const result = convertSOQueriesToPackConfig(getTestQueries(), 'my-space');
      expect(result.queries.default).not.toHaveProperty('pack_id');
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
  });

  describe('convertSOQueriesToPackConfig — D13 default_*_schedule wire format', () => {
    const packRrule: RRuleScheduleConfig = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };
    const queryRrule: RRuleScheduleConfig = {
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      start_date: '2024-02-01T00:00:00.000Z',
    };

    const baseQuery = {
      query: 'SELECT 1',
    };

    test('pack RRULE lands in default_rrule_schedule; queries inherit by omission', () => {
      const queries = {
        q1: { ...baseQuery, interval: 3600 },
        q2: { ...baseQuery, interval: 7200 },
      };

      const result = convertSOQueriesToPackConfig(queries, undefined, {
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      });

      expect(result.default_rrule_schedule).toEqual(packRrule);
      expect(result.queries.q1).toEqual({ query: 'SELECT 1' });
      expect(result.queries.q2).toEqual({ query: 'SELECT 1' });
      expect(result.queries.q1).not.toHaveProperty('rrule_schedule');
      expect(result.queries.q1).not.toHaveProperty('interval');
    });

    test('per-query RRULE override emits rrule_schedule on the query only', () => {
      const queries = {
        inherits: { ...baseQuery, interval: 3600 },
        overrides: {
          ...baseQuery,
          interval: 3600,
          schedule_type: 'rrule' as const,
          rrule_schedule: queryRrule,
        },
      };

      const result = convertSOQueriesToPackConfig(queries, undefined, {
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      });

      expect(result.default_rrule_schedule).toEqual(packRrule);
      expect(result.queries.inherits).not.toHaveProperty('rrule_schedule');
      expect(result.queries.overrides.rrule_schedule).toEqual(queryRrule);
      expect(result.queries.overrides).not.toHaveProperty('interval');
    });

    test('pack-level interval lands in default_native_schedule', () => {
      const queries = {
        q1: { ...baseQuery, interval: 3600 },
        q2: { ...baseQuery, interval: 7200 },
      };

      const result = convertSOQueriesToPackConfig(queries, undefined, {
        schedule_type: 'interval',
        interval: 1800,
      });

      expect(result.default_native_schedule).toEqual({ interval: 1800 });
      expect(result.queries.q1).toEqual({ query: 'SELECT 1' });
      expect(result.queries.q2).toEqual({ query: 'SELECT 1' });
      expect(result).not.toHaveProperty('default_rrule_schedule');
    });

    test('legacy pack (no packSchedule) preserves query interval unchanged', () => {
      const queries = {
        q1: { ...baseQuery, interval: 3600 },
        q2: { ...baseQuery, interval: 7200 },
      };

      const result = convertSOQueriesToPackConfig(queries);

      expect(result).not.toHaveProperty('default_native_schedule');
      expect(result).not.toHaveProperty('default_rrule_schedule');
      expect(result.queries.q1).toEqual({ query: 'SELECT 1', interval: 3600 });
      expect(result.queries.q2).toEqual({ query: 'SELECT 1', interval: 7200 });
    });

    test('mixed: pack RRULE default + per-query overrides; default_space_id collapsed', () => {
      const queries = {
        inherits: { ...baseQuery, interval: 3600 },
        rrule_override: {
          ...baseQuery,
          interval: 3600,
          schedule_type: 'rrule' as const,
          rrule_schedule: queryRrule,
        },
      };

      const result = convertSOQueriesToPackConfig(queries, 'my-space', {
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      });

      expect(result.default_rrule_schedule).toEqual(packRrule);
      expect(result.default_space_id).toBe('my-space');
      expect(result.queries.inherits).toEqual({ query: 'SELECT 1' });
      expect(result.queries.rrule_override).toEqual({
        query: 'SELECT 1',
        rrule_schedule: queryRrule,
      });
      expect(result.queries.inherits).not.toHaveProperty('space_id');
      expect(result.queries.rrule_override).not.toHaveProperty('space_id');
    });

    test('per-query overrides never carry both interval and rrule_schedule', () => {
      const cases = [
        {
          label: "query schedule_type='rrule' overriding pack interval",
          packSchedule: { schedule_type: 'interval' as const, interval: 1800 },
          query: {
            ...baseQuery,
            interval: 3600,
            schedule_type: 'rrule' as const,
            rrule_schedule: queryRrule,
          },
        },
        {
          label: "query schedule_type='interval' overriding pack rrule",
          packSchedule: { schedule_type: 'rrule' as const, rrule_schedule: packRrule },
          query: {
            ...baseQuery,
            interval: 3600,
            schedule_type: 'interval' as const,
            rrule_schedule: queryRrule,
          },
        },
      ];

      for (const { label, packSchedule, query } of cases) {
        const result = convertSOQueriesToPackConfig({ q: query }, undefined, packSchedule);
        const hasInterval = 'interval' in result.queries.q;
        const hasRrule = 'rrule_schedule' in result.queries.q;
        expect({ label, hasInterval, hasRrule, bothSet: hasInterval && hasRrule }).toEqual({
          label,
          hasInterval,
          hasRrule,
          bothSet: false,
        });
      }
    });

    test('does not leak schedule_type into Fleet output (queries or pack-level)', () => {
      const queries = {
        q1: {
          ...baseQuery,
          schedule_type: 'rrule' as const,
          rrule_schedule: queryRrule,
        },
        q2: {
          ...baseQuery,
          schedule_type: 'interval' as const,
          interval: 600,
        },
      };

      const result = convertSOQueriesToPackConfig(queries);

      expect(result).not.toHaveProperty('schedule_type');
      expect(result.queries.q1).not.toHaveProperty('schedule_type');
      expect(result.queries.q2).not.toHaveProperty('schedule_type');
    });

    test('per-query schedule_type="rrule" without rrule_schedule falls through to pack default', () => {
      const queries = {
        q1: {
          ...baseQuery,
          interval: 3600,
          schedule_type: 'rrule' as const,
        },
      };

      const result = convertSOQueriesToPackConfig(queries, undefined, {
        schedule_type: 'interval',
        interval: 1800,
      });

      expect(result.default_native_schedule).toEqual({ interval: 1800 });
      expect(result.queries.q1).toEqual({ query: 'SELECT 1' });
    });

    test('per-query schedule_type="interval" without interval falls through to pack default', () => {
      const queries = {
        q1: {
          ...baseQuery,
          schedule_type: 'interval' as const,
        },
      };

      const result = convertSOQueriesToPackConfig(queries, undefined, {
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      });

      expect(result.default_rrule_schedule).toEqual(packRrule);
      expect(result.queries.q1).toEqual({ query: 'SELECT 1' });
    });
  });

  describe('validateScheduleFields', () => {
    const validRrule: RRuleScheduleConfig = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    describe('pack scope', () => {
      test('accepts empty object (legacy mode)', () => {
        expect(validateScheduleFields('pack', {})).toBeNull();
      });

      test('accepts schedule_type="interval" with interval', () => {
        expect(
          validateScheduleFields('pack', { schedule_type: 'interval', interval: 3600 })
        ).toBeNull();
      });

      test('accepts schedule_type="rrule" with rrule_schedule', () => {
        expect(
          validateScheduleFields('pack', { schedule_type: 'rrule', rrule_schedule: validRrule })
        ).toBeNull();
      });

      test('rejects schedule_type="rrule" without rrule_schedule', () => {
        expect(validateScheduleFields('pack', { schedule_type: 'rrule' })).toMatch(
          /requires `rrule_schedule`/
        );
      });

      test('rejects schedule_type="rrule" together with interval', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: validRrule,
            interval: 3600,
          })
        ).toMatch(/mutually exclusive with `interval`/);
      });

      test('rejects schedule_type="interval" without interval', () => {
        expect(validateScheduleFields('pack', { schedule_type: 'interval' })).toMatch(
          /requires `interval`/
        );
      });

      test('rejects schedule_type="interval" together with rrule_schedule', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'interval',
            interval: 3600,
            rrule_schedule: validRrule,
          })
        ).toMatch(/mutually exclusive with `rrule_schedule`/);
      });

      test('rejects pack-level interval without schedule_type', () => {
        expect(validateScheduleFields('pack', { interval: 3600 })).toMatch(
          /`schedule_type` is required/
        );
      });

      test('rejects pack-level rrule_schedule without schedule_type', () => {
        expect(validateScheduleFields('pack', { rrule_schedule: validRrule })).toMatch(
          /`schedule_type` is required/
        );
      });

      test('rejects rrule with empty rrule string', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: '   ', start_date: '2024-01-01T00:00:00.000Z' },
          })
        ).toMatch(/non-empty RFC 5545 string/);
      });

      test('rejects rrule with invalid start_date', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: 'not-a-date' },
          })
        ).toMatch(/`rrule_schedule.start_date`/);
      });

      test('rejects loose date-only start_date (RFC 3339 strictness)', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01' },
          })
        ).toMatch(/`rrule_schedule.start_date`/);
      });

      test('rejects loose US-style start_date (RFC 3339 strictness)', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '01/02/2024' },
          })
        ).toMatch(/`rrule_schedule.start_date`/);
      });

      test('accepts RFC 3339 start_date with Z suffix', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00Z' },
          })
        ).toBeNull();
      });

      test('accepts RFC 3339 start_date with milliseconds', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' },
          })
        ).toBeNull();
      });

      test('rejects loose end_date (RFC 3339 strictness)', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2024-01-01T00:00:00.000Z',
              end_date: '2024-12-31',
            },
          })
        ).toMatch(/`rrule_schedule.end_date`/);
      });

      test('rejects end_date that is before start_date', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: {
              rrule: 'FREQ=DAILY',
              start_date: '2024-06-01T00:00:00.000Z',
              end_date: '2024-01-01T00:00:00.000Z',
            },
          })
        ).toMatch(/`rrule_schedule.end_date` must be after/);
      });

      test('rejects splay greater than 12 hours', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { ...validRrule, splay: '13h' },
          })
        ).toMatch(/exceeds the maximum of 43200 seconds/);
      });

      test('accepts splay at 2 hours', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { ...validRrule, splay: '2h' },
          })
        ).toBeNull();
      });

      test('accepts splay at 12 hours (boundary)', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { ...validRrule, splay: '12h' },
          })
        ).toBeNull();
      });

      test('rejects malformed splay duration string', () => {
        expect(
          validateScheduleFields('pack', {
            schedule_type: 'rrule',
            rrule_schedule: { ...validRrule, splay: '1d' },
          })
        ).toMatch(/`rrule_schedule.splay` is invalid/);
      });
    });

    describe('query scope', () => {
      test('accepts bare interval (legacy per-query mode)', () => {
        expect(validateScheduleFields('query', { interval: 3600 })).toBeNull();
      });

      test('accepts empty object', () => {
        expect(validateScheduleFields('query', {})).toBeNull();
      });

      test('rejects rrule_schedule without schedule_type at query level', () => {
        expect(validateScheduleFields('query', { rrule_schedule: validRrule })).toMatch(
          /`schedule_type` is required/
        );
      });

      test('accepts schedule_type="rrule" with valid rrule_schedule', () => {
        expect(
          validateScheduleFields('query', { schedule_type: 'rrule', rrule_schedule: validRrule })
        ).toBeNull();
      });
    });

    describe('same-mode constraint (D11)', () => {
      test('accepts same-mode rrule override on rrule pack', () => {
        expect(
          validateScheduleFields(
            'query',
            { schedule_type: 'rrule', rrule_schedule: validRrule },
            'rrule'
          )
        ).toBeNull();
      });

      test('accepts same-mode interval override on interval pack', () => {
        expect(
          validateScheduleFields('query', { schedule_type: 'interval', interval: 600 }, 'interval')
        ).toBeNull();
      });

      test('rejects cross-mode interval override on rrule pack', () => {
        expect(
          validateScheduleFields('query', { schedule_type: 'interval', interval: 600 }, 'rrule')
        ).toMatch(/does not match pack mode `'rrule'`/);
      });

      test('rejects cross-mode rrule override on interval pack', () => {
        expect(
          validateScheduleFields(
            'query',
            { schedule_type: 'rrule', rrule_schedule: validRrule },
            'interval'
          )
        ).toMatch(/does not match pack mode `'interval'`/);
      });

      test('accepts query without override regardless of pack mode', () => {
        expect(validateScheduleFields('query', { interval: 3600 }, 'rrule')).toBeNull();
        expect(validateScheduleFields('query', {}, 'rrule')).toBeNull();
        expect(validateScheduleFields('query', {}, 'interval')).toBeNull();
      });
    });
  });

  describe('buildDiscriminatedScheduleResponseFields', () => {
    const validRrule = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    test('legacy SO with no schedule_type returns empty object', () => {
      expect(buildDiscriminatedScheduleResponseFields({})).toEqual({});
    });

    test('rrule SO returns rrule slot only and drops stale interval', () => {
      expect(
        buildDiscriminatedScheduleResponseFields({
          schedule_type: 'rrule',
          rrule_schedule: validRrule,
          // Stale field left over after a 'interval' → 'rrule' transition.
          interval: 3600,
        })
      ).toEqual({ schedule_type: 'rrule', rrule_schedule: validRrule });
    });

    test('interval SO returns interval slot only and drops stale rrule_schedule', () => {
      expect(
        buildDiscriminatedScheduleResponseFields({
          schedule_type: 'interval',
          interval: 1800,
          // Stale field left over after a 'rrule' → 'interval' transition.
          rrule_schedule: validRrule,
        })
      ).toEqual({ schedule_type: 'interval', interval: 1800 });
    });

    test('rrule SO with missing rrule_schedule still discriminates by type', () => {
      expect(buildDiscriminatedScheduleResponseFields({ schedule_type: 'rrule' })).toEqual({
        schedule_type: 'rrule',
      });
    });

    test('interval SO with missing interval still discriminates by type', () => {
      expect(buildDiscriminatedScheduleResponseFields({ schedule_type: 'interval' })).toEqual({
        schedule_type: 'interval',
      });
    });
  });

  describe('stripScheduleFieldsFromBody', () => {
    test('removes pack-level schedule fields and per-query rrule fields', () => {
      const cleaned = stripScheduleFieldsFromBody({
        name: 'pack',
        schedule_type: 'rrule' as const,
        interval: 3600,
        rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2024-01-01T00:00:00.000Z' },
        queries: {
          q1: {
            query: 'SELECT 1',
            interval: 60,
            schedule_type: 'rrule' as const,
            rrule_schedule: { rrule: 'FREQ=HOURLY', start_date: '2024-01-01T00:00:00.000Z' },
          },
        },
      });

      expect(cleaned).toEqual({
        name: 'pack',
        queries: {
          q1: { query: 'SELECT 1', interval: 60 },
        },
      });
    });

    test('preserves per-query interval (legacy field)', () => {
      const cleaned = stripScheduleFieldsFromBody({
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
      });
      expect(cleaned.queries?.q1).toEqual({ query: 'SELECT 1', interval: 60 });
    });

    test('handles bodies without queries', () => {
      const cleaned = stripScheduleFieldsFromBody({ name: 'p' });
      expect(cleaned).toEqual({ name: 'p', queries: undefined });
    });
  });

  describe('extractAndValidatePackScheduleFromBody', () => {
    const validRrule: RRuleScheduleConfig = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    test('feature flag OFF strips all schedule fields and returns empty pack schedule', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'rrule' as const,
          rrule_schedule: validRrule,
          queries: {
            q1: {
              query: 'SELECT 1',
              interval: 60,
              schedule_type: 'rrule' as const,
              rrule_schedule: validRrule,
            },
          },
        },
        false
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.result.packSchedule).toEqual({});
      expect(result.result.queries?.q1).toEqual({ query: 'SELECT 1', interval: 60 });
    });

    test('feature flag ON with valid pack RRULE returns packSchedule', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'rrule' as const,
          rrule_schedule: validRrule,
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
        },
        true
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.result.packSchedule).toEqual({
        schedule_type: 'rrule',
        interval: undefined,
        rrule_schedule: validRrule,
      });
    });

    test('feature flag ON with valid pack interval returns packSchedule', () => {
      const result = extractAndValidatePackScheduleFromBody(
        { schedule_type: 'interval' as const, interval: 1800, queries: {} },
        true
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.result.packSchedule).toEqual({
        schedule_type: 'interval',
        interval: 1800,
        rrule_schedule: undefined,
      });
    });

    test('feature flag ON with invalid pack schedule returns error', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'rrule' as const,
          interval: 3600,
          rrule_schedule: validRrule,
          queries: {},
        },
        true
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/mutually exclusive/);
    });

    test('feature flag ON with invalid per-query override returns error prefixed by query id', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          queries: {
            q_bad: {
              query: 'SELECT 1',
              interval: 60,
              rrule_schedule: validRrule,
            },
          },
        },
        true
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/^Query "q_bad":/);
    });

    test('feature flag ON with no schedule fields returns empty pack schedule (legacy)', () => {
      const result = extractAndValidatePackScheduleFromBody(
        { queries: { q1: { query: 'SELECT 1', interval: 60 } } },
        true
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.result.packSchedule).toEqual({
        schedule_type: undefined,
        interval: undefined,
        rrule_schedule: undefined,
      });
    });

    test('feature flag ON rejects cross-mode override on rrule pack (D11)', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'rrule' as const,
          rrule_schedule: validRrule,
          queries: {
            q_mixed: {
              query: 'SELECT 1',
              schedule_type: 'interval' as const,
              interval: 600,
            },
          },
        },
        true
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/^Query "q_mixed":/);
      expect(result.error).toMatch(/does not match pack mode `'rrule'`/);
    });

    test('feature flag ON rejects cross-mode override on interval pack (D11)', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'interval' as const,
          interval: 1800,
          queries: {
            q_mixed: {
              query: 'SELECT 1',
              schedule_type: 'rrule' as const,
              rrule_schedule: validRrule,
            },
          },
        },
        true
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/^Query "q_mixed":/);
      expect(result.error).toMatch(/does not match pack mode `'interval'`/);
    });

    test('feature flag ON accepts same-mode rrule override on rrule pack (D11)', () => {
      const result = extractAndValidatePackScheduleFromBody(
        {
          schedule_type: 'rrule' as const,
          rrule_schedule: validRrule,
          queries: {
            q_same: {
              query: 'SELECT 1',
              schedule_type: 'rrule' as const,
              rrule_schedule: {
                rrule: 'FREQ=WEEKLY;BYDAY=MO',
                start_date: '2024-02-01T00:00:00.000Z',
              },
            },
          },
        },
        true
      );
      expect(result.ok).toBe(true);
    });
  });
});
