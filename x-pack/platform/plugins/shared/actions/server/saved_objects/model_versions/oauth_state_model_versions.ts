/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawOAuthStateSchemaV1 } from '../schemas/raw_oauth_state';

export const oauthStateModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawOAuthStateSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawOAuthStateSchemaV1,
    },
  },
};
