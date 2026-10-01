/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV2, userActionForwardCompatibilitySchemaV2 } from '../schemas';

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
    // `source.type` is a closed `oneOf` in `create`, so forward compatibility
    // uses a lenient variant that accepts any string for `type`. Otherwise a
    // node on this version would throw reading a doc from a future version
    // that adds a new source type, instead of just stripping unknown fields.
    forwardCompatibility: userActionForwardCompatibilitySchemaV2,
    create: userActionCreateSchemaV2,
  },
};
