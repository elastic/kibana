/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

export const ANONYMIZATION_MIGRATION_SAVED_OBJECT_TYPE =
  'inference_workflows_anonymization_migration';
export const ANONYMIZATION_MIGRATION_SAVED_OBJECT_ID = 'global-profile';

const migrationSchemaV1 = schema.object({
  sourceHash: schema.string(),
  cloneId: schema.maybe(schema.string()),
  status: schema.oneOf([schema.literal('completed'), schema.literal('needs_ner_review')]),
  timestamp: schema.string(),
});

export interface AnonymizationMigrationAttributes {
  sourceHash: string;
  cloneId?: string;
  status: 'completed' | 'needs_ner_review';
  timestamp: string;
}

export const anonymizationMigrationSavedObjectType: SavedObjectsType = {
  name: ANONYMIZATION_MIGRATION_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: migrationSchemaV1,
        forwardCompatibility: migrationSchemaV1.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};
