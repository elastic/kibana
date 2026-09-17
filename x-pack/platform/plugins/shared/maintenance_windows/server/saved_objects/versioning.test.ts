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

  describe('Scope backfill from v4 to v5', () => {
    it('backfills scope.alerting = { enabled: true } when scope is absent', () => {
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

      expect(migrated.attributes).toMatchObject({ scope: { alerting: { enabled: true } } });
    });

    it('is a no-op when scope.alerting already has enabled: true', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Already enabled',
          enabled: true,
          schedule: {
            custom: {
              duration: '60m',
              start: '2026-01-08T12:01:17.327Z',
              timezone: 'Europe/London',
            },
          },
          scope: { alerting: { enabled: true } },
        },
        references: [],
      };

      const migrated = migrator.migrate({ document: doc, fromVersion: 4, toVersion: 5 });

      expect(migrated.attributes).toMatchObject({ scope: { alerting: { enabled: true } } });
    });

    it('upgrades legacy scope.alerting object by adding enabled: true', () => {
      const filter = { kql: 'severity: "critical"', filters: [], dsl: '{}' };
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

      expect(migrated.attributes).toMatchObject({
        scope: { alerting: { enabled: true, kql: 'severity: "critical"', dsl: '{}' } },
      });
    });

    it('repairs empty-filter bug to scope.alerting = { enabled: true }', () => {
      const doc = {
        id: 'test-id',
        type: 'maintenance-window',
        attributes: {
          title: 'Empty filter bug',
          enabled: true,
          schedule: {
            custom: {
              duration: '60m',
              start: '2026-01-08T12:01:17.327Z',
              timezone: 'Europe/London',
            },
          },
          scope: { alerting: { kql: '', filters: [], dsl: '' } },
        },
        references: [],
      };

      const migrated = migrator.migrate({ document: doc, fromVersion: 4, toVersion: 5 });

      expect(migrated.attributes).toMatchObject({ scope: { alerting: { enabled: true } } });
    });
  });
});
