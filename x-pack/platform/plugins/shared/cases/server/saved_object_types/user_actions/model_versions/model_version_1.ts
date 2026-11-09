/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { userActionCreateSchemaV1 } from '../schemas';

/** Baseline model version for `cases-user-actions`. Documents the existing indexed shape. */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: userActionCreateSchemaV1,
  },
};
