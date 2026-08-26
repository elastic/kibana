/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV2 } from '../schemas';

/**
 * Adds `source` so agent, workflow, rule, and attack-discovery origins are
 * stored on user actions. Only `source.type` is indexed (the sole `source.*`
 * field filtered on today), for filtering by origin kind; `id`, `name`, and
 * `run_id` are stored but read directly off the document rather than
 * searched, so they stay unmapped under the type's `dynamic: false` mapping.
 */
export const modelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        source: {
          properties: {
            type: { type: 'keyword', ignore_above: 1024 },
            /*
            id: {
              type: 'keyword',
            },
            name: {
              type: 'keyword',
            },
            run_id: {
              type: 'keyword',
            },
            */
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: userActionCreateSchemaV2.extends({}, { unknowns: 'ignore' }),
    create: userActionCreateSchemaV2,
  },
};
