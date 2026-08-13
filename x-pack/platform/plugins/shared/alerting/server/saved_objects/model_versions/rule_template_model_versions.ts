/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type ObjectType } from '@kbn/config-schema';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
  rawRuleTemplateSchemaV1,
  rawRuleTemplateSchemaV2,
  rawRuleTemplateSchemaV3,
  rawRuleTemplateSchemaV4,
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
  /**
   * Adds top-level `engine`, accepts either engine v1 or v2
   * shapes, and backfills `engine` so existing values become searchable under the
   * new mapping.
   *
   * oneOf schemas are valid at runtime for create validation but are not ObjectType;
   * cast to satisfy the model-version schema typings.
   */
  '4': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          engine: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: (document) => {
          const { engine } = document.attributes;
          if (engine === undefined) {
            return { attributes: { engine: 'v1' } };
          }
          return { attributes: { engine } };
        },
      },
    ],
    schemas: {
      // oneOf schemas do not support .extends(); apply unknowns: 'ignore' per branch.
      forwardCompatibility: schema.oneOf([
        alertingV1RawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
        alertingV2RawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
      ]) as unknown as ObjectType,
      create: rawRuleTemplateSchemaV4 as unknown as ObjectType,
    },
  },
};
