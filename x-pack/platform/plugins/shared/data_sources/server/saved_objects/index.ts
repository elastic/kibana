/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup, SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const DATA_SOURCE_SAVED_OBJECT_TYPE = 'data_connector';

export interface DataSourceAttributes {
  name: string;
  type: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  features?: string[];
  workflowIds: string[];
  toolIds: string[];
  kscIds: string[];
}

export const dataSourceSchemaV1 = schema.object({
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

export const dataSourceMappings: SavedObjectsTypeMappingDefinition = {
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
    name: DATA_SOURCE_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: dataSourceMappings,
    management: {
      displayName: 'Data Source',
      defaultSearchField: 'name',
      importableAndExportable: true,
      getTitle(obj) {
        const attrs = obj.attributes as unknown as { name: string };
        return `Data Source[${attrs.name}]`;
      },
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: dataSourceSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: dataSourceSchemaV1,
        },
      },
    },
  });
}
