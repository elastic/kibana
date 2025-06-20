/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawScheduledReportSchemaV1 } from './schemas';

export const scheduledReportModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawScheduledReportSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawScheduledReportSchemaV1,
    },
  },
};
