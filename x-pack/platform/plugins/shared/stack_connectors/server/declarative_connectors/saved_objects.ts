/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';

export const DECLARATIVE_CONNECTOR_CATALOG_SO_TYPE = 'declarative_connector_catalog';
export const DECLARATIVE_CONNECTOR_CATALOG_SO_ID = 'active';

const storedCatalogSchema = schema.object({
  catalogVersion: schema.string(),
  activeVersions: schema.recordOf(schema.string(), schema.string()),
  specifications: schema.arrayOf(
    schema.object({
      id: schema.string(),
      version: schema.string(),
      definitionUrl: schema.string(),
      contentHash: schema.string(),
      raw: schema.string(),
    })
  ),
  sourceUrl: schema.string(),
  fetchedAt: schema.string(),
});

export const registerDeclarativeConnectorCatalogSavedObject = (
  savedObjects: SavedObjectsServiceSetup
): void => {
  savedObjects.registerType({
    name: DECLARATIVE_CONNECTOR_CATALOG_SO_TYPE,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      '1': {
        changes: [],
        schemas: {
          create: storedCatalogSchema,
          forwardCompatibility: storedCatalogSchema.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  });
};
