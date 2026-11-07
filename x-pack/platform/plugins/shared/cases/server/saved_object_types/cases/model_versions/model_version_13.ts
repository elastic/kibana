/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV13 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds the pause tracking mappings: `paused_at`, `time_paused`, `pause_reason`, and
 * `resume_to_status_key`.
 */
export const modelVersion13: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        paused_at: {
          type: 'date',
        },
        time_paused: {
          type: 'long',
        },
        pause_reason: {
          type: 'keyword',
        },
        resume_to_status_key: {
          type: 'keyword',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV13.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV13.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
