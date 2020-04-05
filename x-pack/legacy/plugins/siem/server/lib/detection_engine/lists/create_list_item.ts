/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { CreateResponse } from '../../types';
import { transformListItemsToElasticQuery } from './transform_list_items_to_elastic_query';
import { ElasticInputType } from './types';
import { Type } from '../routes/schemas/common/schemas';

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  clusterClient,
  listsItemsIndex,
}: {
  id: string | undefined;
  listId: string;
  type: Type;
  value: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema> => {
  const createdAt = new Date().toISOString();
  const tieBreakerId = uuid.v4();
  const body: ElasticInputType = {
    list_id: listId,
    created_at: createdAt,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    ...transformListItemsToElasticQuery({ type, value }),
  };

  const response: CreateResponse = await clusterClient.callAsCurrentUser('index', {
    index: listsItemsIndex,
    id,
    body,
  });

  return {
    id: response._id,
    type,
    value,
    list_id: listId,
    created_at: createdAt,
    updated_at: createdAt,
    tie_breaker_id: tieBreakerId,
  };
};
