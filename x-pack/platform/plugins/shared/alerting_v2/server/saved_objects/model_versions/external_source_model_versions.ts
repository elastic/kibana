/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { externalSourceAttributesSchemaV1 } from '../schemas/external_source_attributes';

export const externalSourceModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: externalSourceAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: externalSourceAttributesSchemaV1,
    },
  },
};
