/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';

/**
 * Adds the applyToAllCases field to the case-field-definition SO.
 */
export const modelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        applyToAllCases: {
          type: 'boolean',
        },
      },
    },
    {
      type: 'data_backfill',
      // Explicitly default to `false` (not `undefined`) so existing documents
      // behave consistently with newly created ones — no "apply to all" without
      // an explicit opt-in.
      backfillFn: (doc) => ({
        attributes: { applyToAllCases: doc.attributes.applyToAllCases ?? false },
      }),
    },
  ],
};
