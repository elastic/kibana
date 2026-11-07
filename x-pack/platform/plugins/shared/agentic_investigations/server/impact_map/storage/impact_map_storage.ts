/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import {
  IMPACT_MAP_CATALOG_INDEX_NAME,
  IMPACT_MAP_INDEX_NAME,
} from '../../../common/impact_map/constants';
import type {
  ImpactMapEntityType,
  ImpactMapRelationshipType,
  InvestigationImpactMap,
} from '../../../common/impact_map/impact_map';
import type { User } from '../../../common/user';

const userMapping = types.object({
  properties: {
    username: types.keyword({}),
    fullName: types.keyword({}),
    email: types.keyword({}),
    profileUid: types.keyword({}),
  },
});

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * The graph is stored but not indexed; readers load it by conversation.
 */
export const impactMapStorageSettings = {
  name: IMPACT_MAP_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      title: types.keyword({ index: false }),
      entities: types.object({ enabled: false }),
      relationships: types.object({ enabled: false }),
      entityTypes: types.object({ enabled: false }),
      relationshipTypes: types.object({ enabled: false }),
      events: types.object({ enabled: false }),
      createdAt: types.date({}),
      updatedAt: types.date({}),
      createdBy: userMapping,
    },
  },
} satisfies IndexStorageSettings;

export type ImpactMapStorageSettings = typeof impactMapStorageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type ImpactMapDocument = Omit<InvestigationImpactMap, 'id'>;

export const impactMapCatalogStorageSettings = {
  name: IMPACT_MAP_CATALOG_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      entityTypes: types.object({ enabled: false }),
      relationshipTypes: types.object({ enabled: false }),
      updatedAt: types.date({}),
      updatedBy: userMapping,
    },
  },
} satisfies IndexStorageSettings;

/**
 * The catalog belongs to the space, not to a conversation. The document service keys every
 * document by conversation, so the catalog uses this fixed key.
 */
export const IMPACT_MAP_CATALOG_KEY = 'impact_map_catalog' as const;

export interface ImpactMapCatalogDocument {
  spaceId: string;
  conversationId: typeof IMPACT_MAP_CATALOG_KEY;
  entityTypes: ImpactMapEntityType[];
  relationshipTypes: ImpactMapRelationshipType[];
  updatedAt: string;
  updatedBy?: User;
}

export const createImpactMapCatalogStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) =>
  new StorageIndexAdapter<typeof impactMapCatalogStorageSettings, ImpactMapCatalogDocument>(
    esClient,
    logger,
    impactMapCatalogStorageSettings
  ).getClient();
