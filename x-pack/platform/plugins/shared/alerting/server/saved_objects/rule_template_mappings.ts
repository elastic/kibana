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
      ignore_above: 1024,
    },
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
