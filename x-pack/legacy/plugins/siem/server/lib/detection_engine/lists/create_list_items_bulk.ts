/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { transformListItemsToElasticQuery } from './transform_list_items_to_elastic_query';
import { ElasticInputType } from './types';
import { Type } from '../routes/schemas/common/schemas';

export interface CreateBulkType {
  create: { _index: string };
}

export const createListItemsBulk = async ({
  listId,
  type,
  value,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  type: Type;
  value: string[];
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<void> => {
  // It causes errors if you try to add items to bulk that do not exist within ES
  if (!value.length) {
    return;
  }
  const body = value.reduce<Array<ElasticInputType | CreateBulkType>>((accum, singleValue) => {
    // TODO: Pull this body out and the create_list_item body out into a separate function
    const createdAt = new Date().toISOString();
    const tieBreakerId = uuid.v4();
    const elasticBody: ElasticInputType = {
      list_id: listId,
      created_at: createdAt,
      tie_breaker_id: tieBreakerId,
      updated_at: createdAt,
      ...transformListItemsToElasticQuery({ type, value: singleValue }),
    };
    const createBody: CreateBulkType = { create: { _index: listsItemsIndex } };
    return [...accum, createBody, elasticBody];
  }, []);

  await clusterClient.callAsCurrentUser('bulk', {
    body,
    index: listsItemsIndex,
  });
};
