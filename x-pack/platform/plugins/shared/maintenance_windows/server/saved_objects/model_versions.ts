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
import { rawMaintenanceWindowSchemaV1, rawMaintenanceWindowSchemaV2 } from './schema';
import { transformRRuleToCustomSchedule } from '../lib/transforms/rrule_to_custom/latest';

type MaintenanceWindowV1 = TypeOf<typeof rawMaintenanceWindowSchemaV1>;
type MaintenanceWindowV2 = TypeOf<typeof rawMaintenanceWindowSchemaV2>;

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
};
