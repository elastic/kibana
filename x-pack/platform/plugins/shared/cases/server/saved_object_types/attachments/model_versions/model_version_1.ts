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
 * Baseline + indexed scripted `caseId` derived from `references[type=cases].id`.
 * The script runs at index time; `caseId` must never appear in `_source`
 * (ES rejects docs that include a value for a scripted field name).
 */
export const modelVersion1: SavedObjectsFullModelVersion = {
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
