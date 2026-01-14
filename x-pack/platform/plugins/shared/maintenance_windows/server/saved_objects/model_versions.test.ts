/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B. V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements.  Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maintenanceWindowModelVersions } from './model_versions';
import { rawMaintenanceWindowSchemaV1, rawMaintenanceWindowSchemaV2 } from './schema';
import { transformRRuleToCustomSchedule } from '../routes/schemas/schedule';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';

jest.mock('./schema');
jest.mock('../routes/schemas/schedule');

describe('maintenanceWindowModelVersions', () => {
  describe('version 1', () => {
    const modelVersion1 = maintenanceWindowModelVersions[1] as SavedObjectsFullModelVersion;
    it('should have empty changes array', () => {
      expect(modelVersion1.changes).toMatchInlineSnapshot(`Array []`);
    });

    it('should have correct schemas', () => {
      expect(modelVersion1.schemas?.create).toBe(rawMaintenanceWindowSchemaV1);
    });
  });

  describe('version 2', () => {
    const modelVersion2 = maintenanceWindowModelVersions['2'] as SavedObjectsFullModelVersion;
    it('should have correct changes', () => {
      expect(modelVersion2.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "expirationDate": Object {
                "type": "date",
              },
              "title": Object {
                "fields": Object {
                  "keyword": Object {
                    "type": "keyword",
                  },
                },
                "type": "text",
              },
              "updatedAt": Object {
                "type": "date",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 3', () => {
    it('should have correct changes', () => {
      const modelVersion3 = maintenanceWindowModelVersions['3'] as SavedObjectsFullModelVersion;
      expect(modelVersion3.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "createdBy": Object {
                "type": "keyword",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 4', () => {
    const mockTransformRRuleToCustomSchedule =
      transformRRuleToCustomSchedule as jest.MockedFunction<typeof transformRRuleToCustomSchedule>;
    const modelVersion4 = maintenanceWindowModelVersions[4] as SavedObjectsFullModelVersion;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should have correct changes', () => {
      expect(modelVersion4.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "backfillFn": [Function],
            "type": "data_backfill",
          },
        ]
      `);
    });

    it('should have correct schemas', () => {
      expect(modelVersion4.schemas?.create).toBe(rawMaintenanceWindowSchemaV2);
    });

    describe('backfillFn', () => {
      const version4 = maintenanceWindowModelVersions['4'] as SavedObjectsFullModelVersion;
      it('should transform duration and rRule to schedule when schedule does not exist', () => {
        const mockSchedule = {
          duration: '30m',
          start: '2026-01-08T12:01:17.327Z',
          timezone: 'Europe/London',
          recurring: {
            end: '2026-01-08T23:59:59.999Z',
            every: '1h',
          },
        };
        mockTransformRRuleToCustomSchedule.mockReturnValue(mockSchedule);

        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: '2026-01-08T12:01:17.327Z',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            enabled: true,
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2023-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
          originId: 'test-origin',
        };

        const result =
          version4?.changes[0]?.type === 'data_backfill'
            ? version4.changes[0].backfillFn(mockDocument, {} as any)
            : null;

        expect(mockTransformRRuleToCustomSchedule).toHaveBeenCalledWith({
          duration: 3600000,
          rRule: {
            dtstart: '2026-01-08T12:01:17.327Z',
            tzid: 'Europe/London',
            freq: 4,
            interval: 1,
            until: '2026-01-08T23:59:59.999Z',
          },
        });
        expect(result).toEqual({
          attributes: {
            ...mockDocument.attributes,
            schedule: { custom: mockSchedule },
          },
        });
      });

      it('should not transform schedule when schedule already exists', () => {
        const existingSchedule = {
          custom: {
            duration: '30m',
            start: '2026-01-08T12:01:17.327Z',
            timezone: 'Europe/London',
            recurring: {
              end: '2026-01-08T23:59:59.999Z',
              every: '1h',
            },
          },
        };

        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: '2026-01-08T12:01:17.327Z',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            schedule: existingSchedule,
            enabled: true,
          },
          version: '1',
          namespaces: ['default'],
          originId: 'test-origin',
        };

        const result =
          version4?.changes[0]?.type === 'data_backfill'
            ? version4.changes[0].backfillFn(mockDocument, {} as any)
            : null;

        expect(mockTransformRRuleToCustomSchedule).not.toHaveBeenCalled();
        expect(result).toEqual({
          attributes: {
            ...mockDocument.attributes,
            schedule: existingSchedule,
          },
        });
      });

      it('should transform scopedQuery to scope when scope does not exist', () => {
        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: '2026-01-08T12:01:17.327Z',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            scopedQuery: { kql: 'test: query' },
            schedule: {
              custom: {
                duration: '30m',
                start: '2026-01-08T12:01:17.327Z',
                timezone: 'Europe/London',
                recurring: {
                  end: '2026-01-08T23:59:59.999Z',
                  every: '1h',
                },
              },
            },
            enabled: true,
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2023-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
          originId: 'test-origin',
        };

        const result =
          version4?.changes[0]?.type === 'data_backfill'
            ? version4.changes[0].backfillFn(mockDocument, {} as any)
            : null;

        expect(result).toEqual({
          attributes: {
            ...mockDocument.attributes,
            scope: {
              alerting: { kql: 'test: query' },
            },
          },
        });
      });

      it('should not transform scope when scope already exists', () => {
        const existingScope = { alerting: { kql: 'existing' } };
        const existingSchedule = {
          custom: {
            duration: '30m',
            start: '2026-01-08T12:01:17.327Z',
            timezone: 'Europe/London',
            recurring: {
              end: '2026-01-08T23:59:59.999Z',
              every: '1h',
            },
          },
        };

        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: '2026-01-08T12:01:17.327Z',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            scopedQuery: { kql: 'test: query' },
            schedule: existingSchedule,
            scope: existingScope,
            enabled: true,
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2023-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
          originId: 'test-origin',
        };

        const result =
          version4?.changes[0]?.type === 'data_backfill'
            ? version4.changes[0].backfillFn(mockDocument, {} as any)
            : null;

        expect(result).toEqual({
          attributes: {
            ...mockDocument.attributes,
          },
        });
      });

      it('should handle document without scopedQuery', () => {
        const existingSchedule = {
          custom: {
            duration: '30m',
            start: '2026-01-08T12:01:17.327Z',
            timezone: 'Europe/London',
            recurring: {
              end: '2026-01-08T23:59:59.999Z',
              every: '1h',
            },
          },
        };

        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: '2026-01-08T12:01:17.327Z',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            schedule: existingSchedule,
            title: 'Test Window',
            enabled: true,
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2023-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
          originId: 'test-origin',
        };

        const result =
          version4?.changes[0]?.type === 'data_backfill'
            ? version4.changes[0].backfillFn(mockDocument, {} as any)
            : null;

        expect(result).toEqual({
          attributes: {
            ...mockDocument.attributes,
            scope: undefined,
          },
        });
      });
    });
  });
});
