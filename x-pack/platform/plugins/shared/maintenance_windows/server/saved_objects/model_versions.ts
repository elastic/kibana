/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawMaintenanceWindowSchemaV1, rawMaintenanceWindowSchemaV2 } from './schema';
import { transformRRuleToCustomSchedule } from '../routes/schemas/schedule';

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
        backfillFn: (doc) => {
          // Add schedule and scope objects to existing maintenance windows
          let schedule = doc.attributes.schedule;
          let scope = doc.attributes.scope;
          if (doc.attributes.duration && doc.attributes.rRule && !doc.attributes.schedule) {
            const scheduleWithoutCustom = transformRRuleToCustomSchedule({
              duration: doc.attributes.duration,
              rRule: doc.attributes.rRule,
            });

            schedule = { custom: scheduleWithoutCustom };
          }
          if (doc.attributes.scopedQuery && !doc.attributes.scope) {
            scope = {
              alerting: doc.attributes.scopedQuery,
            };
          }
          return { attributes: { ...doc.attributes, schedule, scope } };
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawMaintenanceWindowSchemaV2,
    },
  },
};
