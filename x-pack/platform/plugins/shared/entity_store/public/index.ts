/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityStorePlugin } from './plugin';

export { useInstallEntityStoreV2 } from './hooks/useInstallEntityStoreV2';
export { EntityStoreEuidApiProvider, useEntityStoreEuidApi } from './euid_api_context';
export type {
  EntityStoreEuid,
  EntityStoreEuidApi,
  NonEcsTimelineDataRow,
} from './euid_api_context';

export { ALL_ENTITY_TYPES, EntityType } from '../common';
export type { IdentitySourceFields } from '../common';

export { searchEntitiesFromEntityStore } from './search_entities_api';
export type {
  SearchEntitiesFromEntityStoreParams,
  SearchEntitiesFromEntityStoreResponse,
} from './search_entities_api';

export { bulkUpdateEntities } from './bulk_update_entities_api';
export type {
  BulkUpdateEntitiesParams,
  BulkUpdateEntitiesResponse,
} from './bulk_update_entities_api';

/** Load the EUID API (euid, filter builders). Use when you need them; prefer useEntityStoreEuidApi() in React. */
export const loadEuidApi = () =>
  import('./euid_browser').then((m) => ({
    euid: m.euid,
  }));
export { FF_ENABLE_ENTITY_STORE_V2, ENTITY_STORE_ROUTES } from '../common';

export function plugin() {
  return new EntityStorePlugin();
}
