/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';

/** Baseline model version anchoring `cases-attachments`. */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    // Identity passthrough; the SO has no per-mv config-schema yet.
    forwardCompatibility: (attrs) => attrs,
    create: schema.object({}, { unknowns: 'allow' }),
  },
};
