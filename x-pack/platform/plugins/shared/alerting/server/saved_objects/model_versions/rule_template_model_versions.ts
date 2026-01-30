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
};
