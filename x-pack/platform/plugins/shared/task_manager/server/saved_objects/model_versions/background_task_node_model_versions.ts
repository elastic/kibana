/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  backgroundTaskNodeSchemaV1,
  backgroundTaskNodeSchemaV2,
} from '../schemas/background_task_node';

export const backgroundTaskNodeModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: backgroundTaskNodeSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: backgroundTaskNodeSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          address: { type: 'keyword' },
        },
      },
    ],
    schemas: {
      forwardCompatibility: backgroundTaskNodeSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: backgroundTaskNodeSchemaV2,
    },
  },
};
