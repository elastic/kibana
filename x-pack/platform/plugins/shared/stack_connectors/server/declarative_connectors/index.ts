/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DeclarativeConnectorCatalogService } from './catalog_service';
export {
  DECLARATIVE_CONNECTOR_METADATA,
  registerDeclarativeConnectorTypes,
} from './register_connector_types';
export {
  DECLARATIVE_CONNECTOR_CATALOG_SO_TYPE,
  registerDeclarativeConnectorCatalogSavedObject,
} from './saved_objects';
export { registerDeclarativeConnectorCatalogRoutes } from './routes';
