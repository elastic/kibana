/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ImpactPill } from '@kbn/agentic-investigations-common';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';

/** Stays under the default index max result window. */
const LOOKUP_CHUNK = 1_000;

export interface EntityStoreNameLookupDeps {
  getEntityStore: () => EntityStoreStartContract | undefined;
  getEsClient: (request: KibanaRequest) => ElasticsearchClient;
  getSpaceId: (request: KibanaRequest) => string;
  logger: Logger;
}

/**
 * Prefers Entity Store `entity.name`, the name the entity flyout shows. A pill keeps the name
 * stored on its impact when the store has none.
 */
export const applyEntityStoreNames = (
  pills: readonly ImpactPill[],
  namesById: ReadonlyMap<string, string>
): ImpactPill[] =>
  pills.map((pill) => {
    const name = namesById.get(pill.entityId);
    return name ? { ...pill, name } : pill;
  });

/**
 * Names for Entity Store ids, read as the current user in the request's space. An absent store
 * or a failed read returns no names, so pills fall back to the name stored on the impact.
 */
export const createEntityStoreNameLookup =
  ({ getEntityStore, getEsClient, getSpaceId, logger }: EntityStoreNameLookupDeps) =>
  async (request: KibanaRequest, entityIds: readonly string[]): Promise<Map<string, string>> => {
    const entityStore = getEntityStore();
    if (!entityStore || entityIds.length === 0) {
      return new Map();
    }

    try {
      const client = entityStore.createCRUDClient(getEsClient(request), getSpaceId(request));
      const names = new Map<string, string>();
      for (let index = 0; index < entityIds.length; index += LOOKUP_CHUNK) {
        const chunk = entityIds.slice(index, index + LOOKUP_CHUNK);
        const { entities } = await client.listEntities({
          filter: { terms: { 'entity.id': [...chunk] } },
          size: chunk.length,
          source: ['entity.id', 'entity.name'],
        });
        for (const entity of entities) {
          const id = entity.entity?.id;
          const name = entity.entity?.name;
          if (id && name) {
            names.set(id, name);
          }
        }
      }
      return names;
    } catch (err) {
      logger.debug(`Could not read entity names from Entity Store: ${err}`);
      return new Map();
    }
  };
