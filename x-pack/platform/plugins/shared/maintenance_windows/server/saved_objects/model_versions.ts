/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import { transformRRuleToCustomSchedule } from '@kbn/response-ops-schedule-schema';
import {
  rawMaintenanceWindowSchemaV1,
  rawMaintenanceWindowSchemaV2,
  rawMaintenanceWindowSchemaV3,
} from './schema';

type MaintenanceWindowV1 = TypeOf<typeof rawMaintenanceWindowSchemaV1>;
type MaintenanceWindowV2 = TypeOf<typeof rawMaintenanceWindowSchemaV2>;
type MaintenanceWindowV3 = TypeOf<typeof rawMaintenanceWindowSchemaV3>;

const scheduleAndScopeBackfill: SavedObjectModelDataBackfillFn<
  MaintenanceWindowV1,
  MaintenanceWindowV2
> = (doc) => {
  try {
    // Add schedule and scope objects to existing maintenance windows
    let schedule;
    let scope;
    if (doc.attributes?.duration && doc.attributes?.rRule) {
      const customScheduled = transformRRuleToCustomSchedule({
        duration: doc.attributes.duration,
        rRule: doc.attributes.rRule,
      });

      schedule = { custom: customScheduled };
    }
    if (doc.attributes?.scopedQuery) {
      scope = {
        alerting: doc.attributes.scopedQuery,
      };
    }

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        ...(schedule ? { schedule } : {}),
        ...(scope ? { scope } : {}),
      },
    };
  } catch (e) {
    // In case of an error, return the document as-is to avoid blocking the migration
    return doc;
  }
};

/**
 * Backfill existing maintenance windows to set `scope.alerting = { enabled: true }` so they
 * keep their current behaviour — applying to all alerting v1 alerts — after the explicit-enabled
 * scope model is introduced in MV5.
 *
 * Three on-disk states exist after MV4:
 *   1. scope absent → emit { alerting: { enabled: true } }
 *   2. scope.alerting = null → should not exist (MV4 wrote objects or null from the UI bug path)
 *      but guard anyway: emit { alerting: { enabled: true } }
 *   3. scope.alerting = { kql, filters, dsl? } → preserve filter, add enabled: true
 *
 * IMPORTANT: `data_backfill` results are deep-merged with `lodash.merge`. All emitted values are
 * plain objects (never null), so deep-merge is safe — objects merge correctly.
 *
 * Rollback caveat: MV4's `forwardCompatibility` schema requires `scope.alerting` (not `maybe`),
 * so a doc with only `scope.alertingV2` (v1 unselected) will be rejected by a node rolled back
 * to MV4. Pre-existing docs always have `scope.alerting` present after this backfill.
 * Accepted while alerting v2 is in technical preview.
 */
const scopeV5Backfill: SavedObjectModelDataBackfillFn<MaintenanceWindowV2, MaintenanceWindowV3> = (
  doc
) => {
  const scope = doc.attributes?.scope;

  if (scope?.alerting?.enabled !== undefined) {
    // Already in the new explicit-enabled shape — no-op.
    return { attributes: {} };
  }

  const existingAlerting = scope?.alerting;

  const alerting =
    existingAlerting && existingAlerting !== null
      ? {
          enabled: true,
          ...(existingAlerting.kql ? { kql: existingAlerting.kql } : {}),
          ...(existingAlerting.filters?.length ? { filters: existingAlerting.filters } : {}),
          ...(existingAlerting.dsl ? { dsl: existingAlerting.dsl } : {}),
        }
      : { enabled: true };

  return { attributes: { scope: { alerting } } };
};

export const maintenanceWindowModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawMaintenanceWindowSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          title: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          expirationDate: {
            type: 'date',
          },
          updatedAt: {
            type: 'date',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV1.extends({}, { unknowns: 'ignore' }),
    },
  },
  '3': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          createdBy: {
            type: 'keyword',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV1.extends({}, { unknowns: 'ignore' }),
    },
  },
  '4': {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: scheduleAndScopeBackfill,
      },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawMaintenanceWindowSchemaV2,
    },
  },
  '5': {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: scopeV5Backfill,
      },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawMaintenanceWindowSchemaV3,
    },
  },
};
