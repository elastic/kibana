/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup, SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const DATA_CONNECTOR_SAVED_OBJECT_TYPE = 'data_connector';

export interface DataConnectorAttributes {
  name: string;
  type: string;
  workflowIds: string[];
  toolIds: string[];
  kscIds: string[];
}

// Original schema from model version 1
const dataConnectorSchemaV1Original = schema.object({
  name: schema.string(),
  type: schema.string(),
  config: schema.object({}),
  createdAt: schema.string(),
  updatedAt: schema.string(),
  features: schema.maybe(schema.arrayOf(schema.string())),
  workflowIds: schema.arrayOf(schema.string()),
  toolIds: schema.arrayOf(schema.string()),
  kscIds: schema.arrayOf(schema.string()),
});

// Current minimal schema (model version 2)
// Removed: config, createdAt, updatedAt, features
export const dataConnectorSchemaV2 = schema.object({
  name: schema.string(),
  type: schema.string(),
  workflowIds: schema.arrayOf(schema.string()),
  toolIds: schema.arrayOf(schema.string()),
  kscIds: schema.arrayOf(schema.string()),
});

export const dataConnectorMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    type: {
      type: 'keyword',
    },
    workflowIds: {
      type: 'keyword',
    },
    toolIds: {
      type: 'keyword',
    },
    kscIds: {
      type: 'keyword',
    },
  },
};

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: dataConnectorMappings,
    management: {
      displayName: 'Data Connector',
      defaultSearchField: 'name',
      importableAndExportable: true,
      getTitle(obj) {
        const attrs = obj.attributes as unknown as { name: string };
        return `Data Connector[${attrs.name}]`;
      },
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: dataConnectorSchemaV1Original.extends({}, { unknowns: 'ignore' }),
          create: dataConnectorSchemaV1Original,
        },
      },
      2: {
        changes: [
          {
            type: 'mappings_deprecation',
            deprecatedMappings: ['config', 'createdAt', 'updatedAt', 'features'],
          },
        ],
        schemas: {
          forwardCompatibility: dataConnectorSchemaV2.extends({}, { unknowns: 'ignore' }),
          create: dataConnectorSchemaV2,
        },
      },
    },
  });
}
