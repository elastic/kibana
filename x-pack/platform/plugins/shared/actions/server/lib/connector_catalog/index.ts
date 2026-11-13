/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createConnectorCatalogStorage } from './connector_catalog_storage';
export {
  CATALOG_MANIFEST_DOC_ID,
  CONNECTOR_TYPE_CATALOG_INDEX,
  getCatalogAssetDocId,
  getCatalogDefinitionDocId,
} from './constants';
export type {
  CatalogDefinitionRef,
  CatalogRequestOptions,
  ConnectorCatalogStorage,
  StoredCatalogAsset,
  StoredCatalogDefinition,
  StoredCatalogManifest,
} from './types';
