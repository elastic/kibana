/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertPackQueriesToSO,
  convertSOQueriesToPack,
  convertSOQueriesToPackConfig,
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

    test('includes schedule_id and start_date from scheduleInfo when provided', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries(), {
        scheduleId: 'pack-so-id-123',
        startDate: '2025-01-01T00:00:00.000Z',
      });
      expect(convertedQueries).toStrictEqual(
        getOneLiner({ schedule_id: 'pack-so-id-123', start_date: '2025-01-01T00:00:00.000Z' })
      );
    });

    test('omits schedule_id and start_date when scheduleInfo not provided', () => {
      const convertedQueries = convertSOQueriesToPackConfig(getTestQueries());
      const result = convertedQueries['default'];
      expect(result).not.toHaveProperty('schedule_id');
      expect(result).not.toHaveProperty('start_date');
    });

    test('applies same schedule_id to all queries in a pack', () => {
      const queries = {
        query1: { query: 'SELECT 1;', interval: 60 },
        query2: { query: 'SELECT 2;', interval: 120 },
      };
      const convertedQueries = convertSOQueriesToPackConfig(queries, {
        scheduleId: 'shared-pack-id',
        startDate: '2025-06-01T00:00:00.000Z',
      });
      expect(convertedQueries.query1.schedule_id).toBe('shared-pack-id');
      expect(convertedQueries.query2.schedule_id).toBe('shared-pack-id');
      expect(convertedQueries.query1.start_date).toBe('2025-06-01T00:00:00.000Z');
      expect(convertedQueries.query2.start_date).toBe('2025-06-01T00:00:00.000Z');
    });
  });

  describe('convertPackQueriesToSO', () => {
    test('converts queries to SO format', () => {
      const queries = {
        myQuery: {
          query: 'SELECT 1;',
          interval: 60,
        },
      };
      const result = convertPackQueriesToSO(queries);
      expect(result).toEqual([
        {
          id: 'myQuery',
          query: 'SELECT 1;',
          interval: 60,
        },
      ]);
    });

    test('does not include action_id or start_date', () => {
      const queries = {
        myQuery: {
          query: 'SELECT 1;',
          interval: 60,
          action_id: 'should-be-ignored',
          start_date: 'should-be-ignored',
        },
      };
      const result = convertPackQueriesToSO(queries);
      expect(result[0]).not.toHaveProperty('action_id');
      expect(result[0]).not.toHaveProperty('start_date');
    });
  });
});
