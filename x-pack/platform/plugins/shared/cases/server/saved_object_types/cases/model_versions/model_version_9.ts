/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { casesSchemaV9 } from '../schemas';

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
    create: casesSchemaV9.extends(
      {
        connector: schema.object({
          name: schema.string(),
          type: schema.string(),
          fields: schema.nullable(
            schema.arrayOf(
              schema.object({
                key: schema.string(),
                value: schema.nullable(schema.any()),
              })
            )
          ),
        }),
        // NOTE: this aligns the SO schema with persisted severity here
        // x-pack/platform/plugins/shared/cases/server/common/types/case.ts
        severity: schema.oneOf([
          schema.literal(0),
          schema.literal(10),
          schema.literal(20),
          schema.literal(30),
          // NOTE: this is required for legacy reasons
          schema.literal(40),
        ]),
      },
      { unknowns: 'ignore' }
    ),
  },
};
