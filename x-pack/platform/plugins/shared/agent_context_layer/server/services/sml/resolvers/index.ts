/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  SmlResolver,
  SmlResolverRegistry,
  SmlResolverContext,
  SmlResolverItem,
} from './types';
export { createSmlResolverRegistry } from './resolver_registry';
export { parseOriginId, formatOriginId, type ParsedOriginId } from './origin_id';
export {
  classifyPermission,
  buildCheckPrivilegesPayload,
  collectAuthorizedRawPermissions,
  type ClassifiedPermission,
  type CheckPrivilegesResponsePrivileges,
} from './permissions_dsl';
export { createKibanaResolver, KIBANA_RESOLVER_TYPE } from './kibana_resolver';
export { createEsDocumentResolver, ES_DOCUMENT_RESOLVER_TYPE } from './es_document_resolver';
export { createEsIndexResolver, ES_INDEX_RESOLVER_TYPE } from './es_index_resolver';
