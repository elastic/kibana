/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { maintenanceWindowSavedObjectType } from '.';

describe('Maintenance Window Model Version Migrations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: maintenanceWindowSavedObjectType,
    });
  });

  describe('Schedule backfill from v3 to v4', () => {
    it('properly backfills schedule when upgrading from v3 to v4', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Test Window',
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
      };

      const migrated = migrator.migrate({
        document: doc,
        fromVersion: 3,
        toVersion: 4,
      });

      expect(migrated.attributes).toEqual({
        ...doc.attributes,
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
      });
    });

    it('should backfill scopedQuery to scope when upgrading from v3 to v4', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          duration: 3600000,
          rRule: {
            dtstart: '2026-01-08T12:01:17.327Z',
            tzid: 'Europe/London',
            freq: 4,
            interval: 1,
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
            dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"query"}}],"minimum_should_match":1}},{"exists":{"field":"_id"}}],"should":[],"must_not":[]}}',
          },
          enabled: true,
        },
        references: [],
      };

      const migrated = migrator.migrate({
        document: doc,
        fromVersion: 3,
        toVersion: 4,
      });

      expect(migrated.attributes).toEqual({
        ...doc.attributes,
        schedule: {
          custom: {
            duration: '60m',
            recurring: {
              every: '1h',
            },
            start: '2026-01-08T12:01:17.327Z',
            timezone: 'Europe/London',
          },
        },
        scope: {
          alerting: {
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
            dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"query"}}],"minimum_should_match":1}},{"exists":{"field":"_id"}}],"should":[],"must_not":[]}}',
          },
        },
      });
    });

    it('handles documents without rRule and scopedQuery from v3 to v4', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Test Window',
          enabled: true,
        },
        duration: 3600000,
        references: [],
      };

      const migrated = migrator.migrate({
        document: doc,
        fromVersion: 3,
        toVersion: 4,
      });

      // Should not add schedule if required fields are missing
      expect(migrated.attributes).toEqual({
        ...doc.attributes,
      });
    });
  });

  describe('Migration from v4 to v5 (schema-only — no document rewrite)', () => {
    it('leaves a document with no scope key byte-exact', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'No scope',
          enabled: true,
          schedule: {
            custom: {
              duration: '60m',
              start: '2026-01-08T12:01:17.327Z',
              timezone: 'Europe/London',
            },
          },
        },
        references: [],
      };

      const migrated = migrator.migrate({ document: doc, fromVersion: 4, toVersion: 5 });

      // No backfill — document unchanged so a rollback to MV4 is byte-exact.
      expect(migrated.attributes).toEqual(doc.attributes);
    });

    it('leaves scope.alerting = null byte-exact', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Alerting null',
          enabled: true,
          schedule: {
            custom: {
              duration: '60m',
              start: '2026-01-08T12:01:17.327Z',
              timezone: 'Europe/London',
            },
          },
          scope: { alerting: null },
        },
        references: [],
      };

      const migrated = migrator.migrate({ document: doc, fromVersion: 4, toVersion: 5 });

      expect(migrated.attributes).toEqual(doc.attributes);
    });

    it('leaves a filtered scope (kql/filters/dsl) byte-exact', () => {
      const filter = {
        kql: 'severity: "critical"',
        filters: [],
        dsl: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
      };
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Has filter',
          enabled: true,
          schedule: {
            custom: {
              duration: '60m',
              start: '2026-01-08T12:01:17.327Z',
              timezone: 'Europe/London',
            },
          },
          scope: { alerting: filter },
        },
        references: [],
      };

      const migrated = migrator.migrate({ document: doc, fromVersion: 4, toVersion: 5 });

      expect(migrated.attributes).toEqual(doc.attributes);
    });

    it('accepts MV5-written shape with alertingEnabled via forwardCompatibility (rolled-forward)', () => {
      // Verify that the MV4 forwardCompatibility schema (rawMaintenanceWindowSchemaV2 + unknowns:ignore)
      // accepts documents the new node writes. This is the guard against regression.
      // The document must be a complete MV4-valid document with MV5 additions.
      const mv5Doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'MV5 written',
          enabled: true,
          duration: 3600000,
          rRule: {
            tzid: 'UTC',
            dtstart: '2023-02-26T00:00:00.000Z',
            freq: 2,
            count: 2,
          },
          events: [{ gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T01:00:00.000Z' }],
          createdAt: '2023-02-26T00:00:00.000Z',
          updatedAt: '2023-02-26T00:00:00.000Z',
          createdBy: 'test-user',
          updatedBy: 'test-user',
          expirationDate: '2023-03-26T00:00:00.000Z',
          schedule: {
            custom: {
              start: '2023-02-26T00:00:00.000Z',
              duration: '60m',
              timezone: 'UTC',
              recurring: { every: '1w', occurrences: 2 },
            },
          },
          // MV5 additions — `alertingEnabled` and `alertingV2` are stripped by MV4 unknowns:ignore.
          scope: {
            alertingEnabled: true,
            alerting: null,
            alertingV2: { enabled: true, kql: 'host.name: "prod"' },
          },
        },
        references: [],
      };

      // Migrate from v5 back to v4 — this exercises the MV4 forwardCompatibility path.
      const rolledBack = migrator.migrate({ document: mv5Doc, fromVersion: 5, toVersion: 4 });

      // MV4 strips alertingEnabled and alertingV2 via unknowns:'ignore', leaving alerting: null.
      expect((rolledBack.attributes as Record<string, unknown>).scope).toEqual({ alerting: null });
    });
  });
});
