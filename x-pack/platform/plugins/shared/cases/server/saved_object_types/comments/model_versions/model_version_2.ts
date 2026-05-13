/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { CASE_ID_SCRIPT_SOURCE } from '../../shared/case_id_script';

/**
 * Adds the indexed scripted `caseId` keyword, derived from
 * `references[type=cases].id` at index time. The platform's
 * `pickupUpdatedMappings` (`_update_by_query`) re-runs the script and
 * backfills existing docs automatically — no `data_backfill` step needed.
 */
export const modelVersion2: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        caseId: {
          type: 'keyword',
          on_script_error: 'continue',
          script: { source: CASE_ID_SCRIPT_SOURCE },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: schema.object({}, { unknowns: 'allow' }),
  },
};
