/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getListItemByValue } from './get_list_item_by_value';
import { UpdateResponse } from '../../types';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { transformListItemsToElasticQuery } from './transform_list_items_to_elastic_query';
import { Type } from '../routes/schemas/common/schemas';

export const updateListItem = async ({
  listId,
  type,
  value,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  type: Type;
  value: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const listItem = await getListItemByValue({
    listId,
    type,
    value,
    listsItemsIndex,
    clusterClient,
  });
  if (listItem == null) {
    return null;
  } else {
    const response: UpdateResponse = await clusterClient.callAsCurrentUser('update', {
      index: listsItemsIndex,
      id: listItem.id,
      body: {
        doc: { updated_at: updatedAt, ...transformListItemsToElasticQuery({ type, value }) },
      }, // TODO: Add strong types for the body
    });
    return {
      id: response._id,
      list_id: listId,
      type,
      value,
      created_at: listItem.created_at,
      updated_at: updatedAt,
      tie_breaker_id: listItem.tie_breaker_id,
      // TODO: Add the rest of the elements
    };
  }
};
