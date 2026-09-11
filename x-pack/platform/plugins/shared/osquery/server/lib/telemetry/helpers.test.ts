/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { PackSavedObject, SavedQuerySavedObject } from '../../common/types';
import { templatePacks, templateSavedQueries } from './helpers';
import { TelemetryEventsSender } from './sender';
import { TELEMETRY_EBT_PACK_EVENT, TELEMETRY_EBT_SAVED_QUERY_EVENT } from './constants';

/**
 * EBT wraps every registered schema in `excess()`, so a property emitted by a
 * template helper but missing from the registered schema fails validation in
 * dev mode and is shipped unmapped in production. These tests pin the two
 * together so adding a field to one without the other fails here.
 */
const registeredSchemaKeys = (eventType: string): string[] => {
  const schemas = new Map<string, object>();
  const registerEventType = jest.fn(({ eventType: type, schema }) => {
    schemas.set(type, schema);
  }) as unknown as AnalyticsServiceSetup['registerEventType'];

  new TelemetryEventsSender(loggingSystemMock.createLogger()).registerEvents(registerEventType);

  return Object.keys(schemas.get(eventType) ?? {});
};

describe('osquery telemetry helpers', () => {
  describe('templatePacks', () => {
    it('should emit only properties declared in the registered EBT schema', () => {
      const packs = [
        {
          id: 'pack-1',
          name: 'test-pack',
          enabled: true,
          min_osquery_version: '5.10.0',
          result_type: 'snapshot',
          references: [],
          queries: [
            { id: 'q1', query: 'select 1;', enabled: true },
            { id: 'q2', query: 'select 2;', enabled: false },
          ],
        },
      ] as unknown as PackSavedObject[];

      const [emitted] = templatePacks(packs);

      expect(Object.keys(emitted).sort()).toEqual(
        expect.arrayContaining([
          'disabled_query_count',
          'has_pack_level_result_type',
          'has_pack_level_version',
        ])
      );

      const allowed = registeredSchemaKeys(TELEMETRY_EBT_PACK_EVENT);
      expect(Object.keys(emitted).filter((key) => !allowed.includes(key))).toEqual([]);
    });

    it('should report pack-level defaults and the disabled query count', () => {
      const packs = [
        {
          id: 'pack-1',
          name: 'test-pack',
          enabled: true,
          min_osquery_version: '5.10.0',
          result_type: 'snapshot',
          references: [],
          queries: [
            { id: 'q1', query: 'select 1;', enabled: true },
            { id: 'q2', query: 'select 2;', enabled: false },
          ],
        },
      ] as unknown as PackSavedObject[];

      expect(templatePacks(packs)[0]).toEqual(
        expect.objectContaining({
          has_pack_level_version: true,
          has_pack_level_result_type: true,
          disabled_query_count: 1,
        })
      );
    });

    it('should report no pack-level defaults when none are set', () => {
      const packs = [
        {
          id: 'pack-1',
          name: 'test-pack',
          enabled: true,
          references: [],
          queries: [{ id: 'q1', query: 'select 1;', enabled: true }],
        },
      ] as unknown as PackSavedObject[];

      expect(templatePacks(packs)[0]).toEqual(
        expect.objectContaining({
          has_pack_level_version: false,
          has_pack_level_result_type: false,
          disabled_query_count: 0,
        })
      );
    });

    it('should count disabled queries when `queries` is record-shaped legacy data', () => {
      const packs = [
        {
          id: 'pack-1',
          name: 'legacy-pack',
          enabled: true,
          references: [],
          queries: {
            q1: { query: 'select 1;', enabled: true },
            q2: { query: 'select 2;', enabled: false },
          },
        },
      ] as unknown as PackSavedObject[];

      expect(templatePacks(packs)[0]).toEqual(expect.objectContaining({ disabled_query_count: 1 }));
    });

    it('should skip packs with no queries', () => {
      const packs = [
        { id: 'pack-1', name: 'empty', enabled: true, references: [], queries: [] },
      ] as unknown as PackSavedObject[];

      expect(templatePacks(packs)).toEqual([]);
    });
  });

  describe('templateSavedQueries', () => {
    const savedQuery = (overrides: object) =>
      [
        { id: 'sq-1', query: 'select 1;', interval: '60', ...overrides },
      ] as unknown as SavedQuerySavedObject[];

    it('should emit only properties declared in the registered EBT schema', () => {
      const [emitted] = templateSavedQueries(savedQuery({ version: '5.10.0' }), []);

      expect(emitted).toEqual(expect.objectContaining({ version_set: true }));

      const allowed = registeredSchemaKeys(TELEMETRY_EBT_SAVED_QUERY_EVENT);
      expect(Object.keys(emitted).filter((key) => !allowed.includes(key))).toEqual([]);
    });

    it('should report `version_set: false` when the query has no version', () => {
      expect(templateSavedQueries(savedQuery({}), [])[0]).toEqual(
        expect.objectContaining({ version_set: false })
      );
    });

    it('should flag prebuilt saved queries', () => {
      expect(templateSavedQueries(savedQuery({}), ['sq-1'])[0]).toEqual(
        expect.objectContaining({ prebuilt: true })
      );
    });
  });
});
