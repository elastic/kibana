/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsTypeMappingDefinition,
} from '@kbn/core/server';

export const EXTRACTION_CONFIG_SO_TYPE = 'data_sources_extraction_config';
export const EXTRACTION_CONFIG_SO_ID = 'data-sources-extraction-config';

const methodSchema = schema.oneOf([
  schema.literal('tika'),
  schema.literal('inference'),
  schema.literal('workflow'),
  schema.literal('connector'),
]);

const formatOverrideSchema = schema.object({
  method: methodSchema,
  inferenceId: schema.maybe(schema.string()),
  workflowId: schema.maybe(schema.string()),
  connectorId: schema.maybe(schema.string()),
});

const extractionConfigSchema = schema.object({
  method: methodSchema,
  inferenceId: schema.maybe(schema.string()),
  workflowId: schema.maybe(schema.string()),
  connectorId: schema.maybe(schema.string()),
  formatOverrides: schema.maybe(schema.recordOf(schema.string(), formatOverrideSchema)),
});

const extractionConfigMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    method: { type: 'keyword' },
    inferenceId: { type: 'keyword' },
    workflowId: { type: 'keyword' },
    connectorId: { type: 'keyword' },
  },
};

export function registerExtractionConfigSavedObject(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: EXTRACTION_CONFIG_SO_TYPE,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: extractionConfigMappings,
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: extractionConfigSchema.extends({}, { unknowns: 'ignore' }),
          create: extractionConfigSchema,
        },
      },
    },
  });
}
