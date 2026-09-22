/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawGapAutoFillSchedulerSchemaV1 } from '../schemas/raw_gap_auto_fill_scheduler';
import { rawGapAutoFillSchedulerSchemaV2 } from '../schemas/raw_gap_auto_fill_scheduler/v2';

export const gapAutoFillSchedulerModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawGapAutoFillSchedulerSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawGapAutoFillSchedulerSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawGapAutoFillSchedulerSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawGapAutoFillSchedulerSchemaV2,
    },
  },
};
