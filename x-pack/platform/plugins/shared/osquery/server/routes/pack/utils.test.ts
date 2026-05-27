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
    // output to its pre-PR-A shape — interval and rrule are equal-class modes;
    // "no schedule_type" is the default-inheritance branch, not a legacy mode.
    // See `design.md` D36, tasks.md 1.12.6/7.
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

    // Mutual-exclusivity on the per-query override (only fires when input
    // explicitly opts in via schedule_type). Dead code under flag-off; tested
    // here so PR C inherits a correct foundation.
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
  });
});
