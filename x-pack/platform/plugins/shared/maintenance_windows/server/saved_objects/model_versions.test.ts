/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maintenanceWindowModelVersions } from './model_versions';
import { rawMaintenanceWindowSchemaV1, rawMaintenanceWindowSchemaV2 } from './schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';

jest.mock('./schema');

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
    const modelVersion4 = maintenanceWindowModelVersions[4] as SavedObjectsFullModelVersion;

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
              byweekday: ['-1MO', 'TU', 'WE', 'TH', '+4FR'],
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
          ...mockDocument,
          attributes: {
            ...mockDocument.attributes,
            schedule: {
              custom: {
                duration: '60m',
                start: '2026-01-08T12:01:17.327Z',
                timezone: 'Europe/London',
                recurring: {
                  end: '2026-01-08T23:59:59.999Z',
                  every: '1h',
                  onWeekDay: ['-1MO', 'TU', 'WE', 'TH', '+4FR'],
                },
              },
            },
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
            scopedQuery: {
              filters: [
                {
                  $state: {
                    store: 'appState',
                  },
                  meta: {
                    disabled: false,
                    negate: false,
                    alias: null,
                    key: '_id',
                    field: '_id',
                    value: 'exists',
                    type: 'exists',
                  },
                  query: {
                    exists: {
                      field: '_id',
                    },
                  },
                },
              ],
              kql: 'test: query',
              dsl: `{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"query"}}],"minimum_should_match":1}},{"exists":{"field":"_id"}}],"should":[],"must_not":[]}}`,
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
          ...mockDocument,
          attributes: {
            ...mockDocument.attributes,
            schedule: {
              custom: {
                duration: '60m',
                recurring: {
                  end: '2026-01-08T23:59:59.999Z',
                  every: '1h',
                },
                start: '2026-01-08T12:01:17.327Z',
                timezone: 'Europe/London',
              },
            },
            scope: {
              alerting: {
                dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"query"}}],"minimum_should_match":1}},{"exists":{"field":"_id"}}],"should":[],"must_not":[]}}',
                filters: [
                  {
                    $state: {
                      store: 'appState',
                    },
                    meta: {
                      alias: null,
                      disabled: false,
                      field: '_id',
                      key: '_id',
                      negate: false,
                      type: 'exists',
                      value: 'exists',
                    },
                    query: {
                      exists: {
                        field: '_id',
                      },
                    },
                  },
                ],
                kql: 'test: query',
              },
            },
          },
        });
      });

      it('should handle document without scopedQuery', () => {
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
          ...mockDocument,
          attributes: {
            ...mockDocument.attributes,
            schedule: {
              custom: {
                duration: '60m',
                recurring: {
                  end: '2026-01-08T23:59:59.999Z',
                  every: '1h',
                },
                start: '2026-01-08T12:01:17.327Z',
                timezone: 'Europe/London',
              },
            },
            scope: undefined,
          },
        });
      });

      it('should return doc unchanged in case of error during backfill', () => {
        const mockDocument = {
          id: 'test-id',
          type: 'maintenance-window',
          attributes: {
            duration: 3600000,
            rRule: {
              dtstart: 'invalid-date-string',
              tzid: 'Europe/London',
              freq: 4,
              interval: 1,
              until: '2026-01-08T23:59:59.999Z',
            },
            scopedQuery: {
              filters: [
                {
                  $state: {
                    store: 'appState',
                  },
                  meta: {
                    disabled: false,
                    negate: false,
                    alias: null,
                    key: '_id',
                    field: '_id',
                    value: 'exists',
                    type: 'exists',
                  },
                  query: {
                    exists: {
                      field: '_id',
                    },
                  },
                },
              ],
              kql: 'test: query',
              dsl: `{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"query"}}],"minimum_should_match":1}},{"exists":{"field":"_id"}}],"should":[],"must_not":[]}}`,
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
          ...mockDocument,
        });
      });
    });
  });
});
