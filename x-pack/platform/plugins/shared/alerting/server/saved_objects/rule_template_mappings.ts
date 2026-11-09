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
    /**
     * Alerting v2 templates nest the create-rule payload under `rule`. Only the
     * fields the v2 read APIs search, filter, sort, and aggregate on are indexed;
     * they mirror the `alerting_rule` mappings so both surfaces sort identically.
     */
    rule: {
      properties: {
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
      },
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
