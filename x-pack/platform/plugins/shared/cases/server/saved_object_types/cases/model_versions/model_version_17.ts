/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV17 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds `room_conversation_id` (the case's room, created on first open) and the unmapped
 * `settings.agent` and `room_owner_uid`. All are absent on existing cases, which read as "no room
 * yet" and "agent off".
 */
export const modelVersion17: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        room_conversation_id: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV17.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV17.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
