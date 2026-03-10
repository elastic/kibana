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

    test('includes schedule_id and start_date when present', () => {
      const convertedQueries = convertSOQueriesToPackConfig(
        getTestQueries({ schedule_id: 'abc-123', start_date: '2025-01-01T00:00:00.000Z' })
      );
      expect(convertedQueries).toStrictEqual(
        getOneLiner({ schedule_id: 'abc-123', start_date: '2025-01-01T00:00:00.000Z' })
      );
    });

    test('omits schedule_id and start_date when absent', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries());
      const result = convertedQueries.default;
      expect(result).not.toHaveProperty('schedule_id');
      expect(result).not.toHaveProperty('start_date');
    });

    test('includes space_id when spaceId is provided', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries(), 'my-space');
      expect(convertedQueries.default).toHaveProperty('space_id', 'my-space');
    });

    test('omits space_id when spaceId is undefined', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries());
      expect(convertedQueries.default).not.toHaveProperty('space_id');
    });
  });

  describe('convertPackQueriesToSO', () => {
    test('preserves schedule_id and start_date when present', () => {
      const queries = {
        query1: {
          name: 'Test Query',
          query: 'SELECT 1',
          interval: 60,
          schedule_id: 'uuid-1',
          start_date: '2025-01-01T00:00:00.000Z',
        },
      };
      const result = convertPackQueriesToSO(queries);
      expect(result).toEqual([
        expect.objectContaining({
          id: 'query1',
          schedule_id: 'uuid-1',
          start_date: '2025-01-01T00:00:00.000Z',
        }),
      ]);
    });

    test('omits schedule_id and start_date when absent', () => {
      const queries = {
        query1: {
          name: 'Test Query',
          query: 'SELECT 1',
          interval: 60,
        },
      };
      const result = convertPackQueriesToSO(queries);
      expect(result[0]).not.toHaveProperty('schedule_id');
      expect(result[0]).not.toHaveProperty('start_date');
    });

    test('handles mixed queries with and without schedule_id', () => {
      const queries = {
        query1: {
          name: 'With schedule',
          query: 'SELECT 1',
          interval: 60,
          schedule_id: 'uuid-1',
          start_date: '2025-01-01T00:00:00.000Z',
        },
        query2: {
          name: 'Without schedule',
          query: 'SELECT 2',
          interval: 120,
        },
      };
      const result = convertPackQueriesToSO(queries);
      expect(result).toHaveLength(2);
      const withSchedule = result.find((q) => q.id === 'query1');
      const withoutSchedule = result.find((q) => q.id === 'query2');
      expect(withSchedule?.schedule_id).toBe('uuid-1');
      expect(withSchedule?.start_date).toBe('2025-01-01T00:00:00.000Z');
      expect(withoutSchedule).not.toHaveProperty('schedule_id');
      expect(withoutSchedule).not.toHaveProperty('start_date');
    });
  });
});
