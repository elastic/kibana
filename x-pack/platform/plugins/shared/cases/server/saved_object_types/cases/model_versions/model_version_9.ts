/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { casesSchemaV9 } from '../schemas';
import { createSchemaOverrides } from './create_schema_overrides';

export const modelVersion9: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        template: {
          type: 'object',
          properties: {
            id: {
              type: 'keyword',
            },
            version: {
              type: 'integer',
            },
          },
        },
        [CASE_EXTENDED_FIELDS]: {
          type: 'flattened',
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV9.extends({}, { unknowns: 'ignore' }),
    create: casesSchemaV9.extends(createSchemaOverrides, { unknowns: 'ignore' }),
  },
};
