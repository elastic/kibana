/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { EntityType } from '../common';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../common';

export interface BulkUpdateEntitiesParams {
  entityType: EntityType;
  body: Record<string, unknown>;
  force?: boolean;
}

export interface BulkUpdateEntitiesResponse {
  ok: boolean;
  errors: Array<{
    _id?: string;
    status?: number;
    type?: string;
    reason?: string;
  }>;
}

/**
 * Bulk-update a single entity document via the Entity Store v2 CRUD bulk route.
 */
export async function bulkUpdateEntities(
  http: HttpStart,
  params: BulkUpdateEntitiesParams,
  options?: { signal?: AbortSignal }
): Promise<BulkUpdateEntitiesResponse> {
  return http.fetch<BulkUpdateEntitiesResponse>(ENTITY_STORE_ROUTES.public.CRUD_BULK_UPDATE, {
    version: API_VERSIONS.public.v1,
    method: 'PUT',
    query: params.force === undefined ? undefined : { force: params.force },
    body: JSON.stringify({
      entities: [{ type: params.entityType, doc: params.body }],
    }),
    signal: options?.signal,
  });
}
