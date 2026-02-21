/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_MUTED } from '@kbn/rule-data-utils';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import {
  getLifecycleAlertsQueries,
  getContinualAlertsQuery,
  getMaintenanceWindowAlertsQuery,
  getHitsWithCount,
  RUNTIME_MAINTENANCE_WINDOW_ID_FIELD,
} from './get_summarized_alerts_query';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';

const toFilterArray = (f: unknown): unknown[] =>
  Array.isArray(f) ? f : f != null ? [f] : [];

const hasAlertMutedFilter = (filter: unknown[]): boolean =>
  Array.isArray(filter) &&
  filter.some(
    (clause) =>
      typeof clause === 'object' &&
      clause !== null &&
      'bool' in clause &&
      (clause as { bool?: { must_not?: { term?: Record<string, unknown> } } }).bool?.must_not
        ?.term?.[ALERT_MUTED] === true
  );

describe('get_summarized_alerts_query', () => {
  describe('getLifecycleAlertsQueries', () => {
    test('excludes ALERT_MUTED true when using executionUuid', () => {
      const queries = getLifecycleAlertsQueries({
        executionUuid: 'exec-123',
        ruleId: 'rule-1',
        excludedAlertInstanceIds: [],
        maxAlertLimit: 100,
      });

      expect(queries).toHaveLength(3);
      for (const query of queries) {
        const filter = (query as SearchRequest).query?.bool?.filter;
        expect(hasAlertMutedFilter(toFilterArray(filter))).toBe(true);
      }
    });

    test('excludes ALERT_MUTED true when using time range', () => {
      const start = new Date('2024-01-01T00:00:00.000Z');
      const end = new Date('2024-01-02T00:00:00.000Z');
      const queries = getLifecycleAlertsQueries({
        start,
        end,
        ruleId: 'rule-1',
        excludedAlertInstanceIds: [],
        maxAlertLimit: 100,
      });

      expect(queries).toHaveLength(3);
      for (const query of queries) {
        const filter = (query as SearchRequest).query?.bool?.filter;
        expect(hasAlertMutedFilter(toFilterArray(filter))).toBe(true);
      }
    });

    test('includes excludedAlertInstanceIds in filter when provided', () => {
      const queries = getLifecycleAlertsQueries({
        executionUuid: 'exec-123',
        ruleId: 'rule-1',
        excludedAlertInstanceIds: ['instance-a', 'instance-b'],
        maxAlertLimit: 100,
      });

      const firstQuery = toFilterArray(
        (queries[0] as SearchRequest).query?.bool?.filter
      );
      const hasExcludedIds = firstQuery.some(
        (clause: unknown) =>
          typeof clause === 'object' &&
          clause !== null &&
          'bool' in clause &&
          JSON.stringify(clause).includes('instance-a')
      );
      expect(hasExcludedIds).toBe(true);
    });
  });

  describe('getContinualAlertsQuery', () => {
    test('excludes ALERT_MUTED true when using executionUuid', () => {
      const query = getContinualAlertsQuery({
        executionUuid: 'exec-456',
        ruleId: 'rule-2',
        excludedAlertInstanceIds: [],
        maxAlertLimit: 50,
      });

      const filter = (query as SearchRequest).query?.bool?.filter;
      expect(hasAlertMutedFilter(toFilterArray(filter))).toBe(true);
    });

    test('excludes ALERT_MUTED true when using time range', () => {
      const start = new Date('2024-02-01T00:00:00.000Z');
      const end = new Date('2024-02-02T00:00:00.000Z');
      const query = getContinualAlertsQuery({
        start,
        end,
        ruleId: 'rule-2',
        excludedAlertInstanceIds: [],
        maxAlertLimit: 50,
      });

      const filter = (query as SearchRequest).query?.bool?.filter;
      expect(hasAlertMutedFilter(toFilterArray(filter))).toBe(true);
    });
  });

  describe('getMaintenanceWindowAlertsQuery', () => {
    test('excludes ALERT_MUTED true in scoped queries', () => {
      const items = getMaintenanceWindowAlertsQuery({
        executionUuid: 'exec-mw',
        ruleId: 'rule-mw',
        maxAlertLimit: 10,
        maintenanceWindows: [
          {
            id: 'mw-1',
            scope: {
              alerting: {
                dsl: JSON.stringify({ bool: { filter: [] } }),
                kql: '',
                filters: [],
              },
            },
          } as unknown as MaintenanceWindow,
        ],
      });

      expect(items.length).toBeGreaterThan(0);
      const searchBodies = items.filter((_, i) => i % 2 === 1);
      for (const body of searchBodies) {
        if (body && typeof body === 'object' && 'query' in body) {
          const filter = (body as { query?: { bool?: { filter?: unknown } } }).query?.bool?.filter;
          expect(hasAlertMutedFilter(toFilterArray(filter))).toBe(true);
        }
      }
    });
  });

  describe('getHitsWithCount', () => {
    test('returns count and data from search result', () => {
      const total = 2;
      const hits = [
        {
          _id: '1',
          _index: '.alerts-index',
          _source: { 'kibana.alert.instance.id': 'a', '@timestamp': '2024-01-01T00:00:00.000Z' },
        },
        {
          _id: '2',
          _index: '.alerts-index',
          _source: { 'kibana.alert.instance.id': 'b', '@timestamp': '2024-01-01T00:00:00.000Z' },
        },
      ];
      const result = getHitsWithCount({
        total: { value: total, relation: 'eq' },
        hits: hits as never,
        aggregations: undefined as never,
      });

      expect(result.count).toBe(total);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({ _id: '1', _index: '.alerts-index' });
    });
  });

  describe('RUNTIME_MAINTENANCE_WINDOW_ID_FIELD', () => {
    test('is defined for use in maintenance window queries', () => {
      expect(RUNTIME_MAINTENANCE_WINDOW_ID_FIELD).toBe('runtime_maintenance_window_id');
    });
  });
});
