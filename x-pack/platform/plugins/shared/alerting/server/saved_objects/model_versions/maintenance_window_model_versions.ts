/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawMaintenanceWindowSchemaV1 } from '../schemas/raw_maintenance_window';

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
};
