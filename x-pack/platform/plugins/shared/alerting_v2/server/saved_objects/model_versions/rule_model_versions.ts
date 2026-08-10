/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
} from '../schemas/rule_saved_object_attributes';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
  '2': {
    // Index the already-existing `schedule.every` attribute so the
    // maxScheduledPerMinute guardrail can aggregate scheduled frequency.
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          schedule: {
            properties: {
              every: { type: 'keyword', ignore_above: 256 },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
  '3': {
    // Adds the server-managed `metadata.version` attribute. It is not indexed (we never
    // search/sort/aggregate on it), so there is no mappings change. Pre-v3 rules
    // are backfilled to `1` so every rule has a valid baseline counter; the next
    // mutation increments from there.
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc) => ({
          attributes: { metadata: { ...doc.attributes.metadata, version: 1 } },
        }),
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV2,
    },
  },
};
