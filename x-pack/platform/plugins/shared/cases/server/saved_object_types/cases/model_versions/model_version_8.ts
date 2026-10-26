/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import type { casesSchemaV7 } from '../schemas';
import { casesSchemaV8 } from '../schemas';

type SchemaV7 = TypeOf<typeof casesSchemaV7>;
type SchemaV8 = TypeOf<typeof casesSchemaV8>;
const backfillFn: SavedObjectModelDataBackfillFn<SchemaV7, SchemaV8> = ({ attributes }) => {
  return { attributes: { total_observables: attributes.observables?.length ?? 0 } };
};

/**
 * Adds the total_events field to the cases SO.
 */
export const modelVersion8: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        total_observables: {
          type: 'integer',
        },
      },
    },
    {
      type: 'data_backfill',
      backfillFn,
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV8.extends({}, { unknowns: 'ignore' }),
  },
};
