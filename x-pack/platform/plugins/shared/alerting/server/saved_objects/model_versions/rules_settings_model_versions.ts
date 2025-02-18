/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawRulesSettingsSchemaV1 } from '../schemas/raw_rules_settings';

export const rulesSettingsModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRulesSettingsSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawRulesSettingsSchemaV1,
    },
  },
};
