/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { actionTaskParamsSchemaV1, actionTaskParamsSchemaV2 } from '../schemas/action_task_params';

export const actionTaskParamsModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: actionTaskParamsSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: actionTaskParamsSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          apiKeyId: { type: 'keyword' },
        },
      },
    ],
    schemas: {
      forwardCompatibility: actionTaskParamsSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: actionTaskParamsSchemaV2,
    },
  },
};
