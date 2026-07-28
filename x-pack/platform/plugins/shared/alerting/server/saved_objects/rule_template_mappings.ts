/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const ruleTemplateMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    engine: {
      type: 'keyword',
    },
    kind: {
      type: 'keyword',
      ignore_above: 256,
    },
    metadata: {
      properties: {
        name: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        description: {
          type: 'text',
        },
        tags: {
          type: 'keyword',
          ignore_above: 128,
        },
      },
    },
    schedule: {
      properties: {
        every: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
    },
    // Fleet / v1 layout fields (still used by non-v2 templates)
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          normalizer: 'lowercase',
        },
      },
    },
    ruleTypeId: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
    },
    description: {
      type: 'text',
    },
  },
};
