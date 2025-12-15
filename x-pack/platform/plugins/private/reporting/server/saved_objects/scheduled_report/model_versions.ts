/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawScheduledReportSchemaV1,
  rawScheduledReportSchemaV2,
  rawScheduledReportSchemaV3,
  rawScheduledReportSchemaV4,
  rawScheduledReportSchemaV5,
} from './schemas';

export const scheduledReportModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV2,
    },
  },
  '3': {
    changes: [],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV3,
    },
  },
  '4': {
    changes: [],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV4,
    },
  },
  '5': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          title: {
            type: 'text',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV5.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV5,
    },
  },
};
