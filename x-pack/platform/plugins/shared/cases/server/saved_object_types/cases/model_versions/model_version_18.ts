/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV18 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds `pending_decisions` (proposals on the case still awaiting a decision, mapped so the list can
 * filter on it) and the unmapped `ai_verdict.summary`. Absent on existing cases, which read as "none".
 */
export const modelVersion18: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        pending_decisions: { type: 'integer' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV18.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV18.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
