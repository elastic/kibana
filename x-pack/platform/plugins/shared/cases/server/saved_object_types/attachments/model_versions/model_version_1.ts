/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { CASE_ID_FIELD_MAPPING } from '../../shared/case_id_script';

/**
 * Baseline + indexed scripted `caseId` derived from `references[type=cases].id`.
 * Mapping is sourced from the shared `CASE_ID_FIELD_MAPPING` so the top-level
 * `mappings.properties.caseId` and this `addedMappings` stay in sync — Kibana
 * validates the two and refuses to start if they diverge.
 */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        caseId: CASE_ID_FIELD_MAPPING,
      },
    },
  ],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: schema.object({}, { unknowns: 'allow' }),
  },
};
