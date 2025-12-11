/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsServiceSetup, SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const DATA_CONNECTOR_SAVED_OBJECT_TYPE = 'data_connector';

export interface DataConnectorAttributes {
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

export const dataConnectorMappings: SavedObjectsTypeMappingDefinition = {
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
    config: {
      type: 'object',
      enabled: false,
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
    features: {
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
  });
}
