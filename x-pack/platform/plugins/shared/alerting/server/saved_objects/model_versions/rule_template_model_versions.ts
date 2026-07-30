/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawRuleTemplateSchemaV1,
  rawRuleTemplateSchemaV2,
  rawRuleTemplateSchemaV3,
  rawRuleTemplateSchemaV4,
  rawRuleTemplateSchemaV5,
} from '../schemas/raw_rule_template';

export const ruleTemplateModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV2,
    },
  },
  '3': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          description: {
            type: 'text',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV3,
    },
  },
  '4': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          engine: {
            type: 'keyword',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV4,
    },
  },
  /**
   * MV4 may already be recorded on clusters that applied an earlier shape of the
   * engine mapping (e.g. `params.engine`). Bumping to MV5 re-runs the additive
   * mapping update for top-level `engine` and backfills existing docs so values
   * already present in `_source` become searchable.
   */
  '5': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          engine: {
            type: 'keyword',
          },
        },
      },
      {
        type: 'mappings_deprecation',
        deprecatedMappings: ['params.engine'],
      },
      {
        type: 'data_backfill',
        backfillFn: (document) => {
          const { engine } = document.attributes;
          if (engine === undefined) {
            return { attributes: {} };
          }
          return { attributes: { engine } };
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV4,
    },
  },
  /**
   * Accept alerting-v2 create-rule-aligned template attributes (`engine: "v2"`)
   * alongside the Fleet / `.es-query` layout. Adds searchable mappings used by
   * the alerting_v2 rule library.
   */
  '6': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
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
        },
      },
    ],
    schemas: {
      // oneOf schemas do not support .extends(); each branch already constrains fields.
      forwardCompatibility: rawRuleTemplateSchemaV5,
      create: rawRuleTemplateSchemaV5,
    },
  },
};
