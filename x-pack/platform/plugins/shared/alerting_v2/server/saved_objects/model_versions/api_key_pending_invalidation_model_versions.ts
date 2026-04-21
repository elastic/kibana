/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { apiKeyPendingInvalidationAttributesSchemaV1 } from '../schemas/api_key_pending_invalidation_attributes';

export const apiKeyPendingInvalidationModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: apiKeyPendingInvalidationAttributesSchemaV1.extends(
        {},
        { unknowns: 'ignore' }
      ),
      create: apiKeyPendingInvalidationAttributesSchemaV1,
    },
  },
};
