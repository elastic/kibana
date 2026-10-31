/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV12 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds the server-owned `observables_sync_pending` boolean mapping. It is set when an observable
 * write could not be mirrored to the observables index, and is absent on existing cases.
 */
export const modelVersion12: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        observables_sync_pending: {
          type: 'boolean',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV12.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV12.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
