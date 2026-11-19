/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV10 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

/**
 * Adds the `username`, `full_name` and `email` mappings to `assignees`,
 * mirroring the `User` shape stored on `created_by`/`closed_by`
 */
export const modelVersion10: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        assignees: {
          properties: {
            username: {
              type: 'keyword',
              ignore_above: 1024,
            },
            full_name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            email: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV10.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV10.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
