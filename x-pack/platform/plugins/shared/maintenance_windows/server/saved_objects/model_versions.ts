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
      // {
      //   type: 'data_backfill',
      //   backfillFunction: async (doc) => {
      //     // Add default schedule object to existing maintenance windows
      //     if (!doc.attributes.schedule) {
      //       const schedule = transformRRuleToCustomSchedule({
      //         duration: doc.attributes.duration,
      //         rRule: doc.attributes.rRule,
      //       });
      //       doc.attributes.schedule = {
      //         custom: schedule,
      //       };
      //     }
      //     return doc;
      //   },
      // },
    ],
    schemas: {
      forwardCompatibility: rawMaintenanceWindowSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawMaintenanceWindowSchemaV2,
    },
  },
};
