/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV16 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds the case outcome fields: `close_reason`, `human_verdict`, `ai_verdict`, and the case
 * `source`. All are nullable with no backfill, so existing cases read as "not set".
 */
export const modelVersion16: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        close_reason: { type: 'keyword' },
        human_verdict: { type: 'keyword' },
        source: { type: 'keyword' },
        ai_verdict: { properties: { verdict: { type: 'keyword' } } },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV16.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV16.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
