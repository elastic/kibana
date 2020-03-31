/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getListItemByValue } from './get_list_item_by_value';
import { UpdateResponse } from '../../types';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';

export const updateListItem = async ({
  listId,
  ip,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  ip: string | undefined;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema | null> => {
  // TODO Implement updatedAt from below
  // const updatedAt = new Date().toISOString();
  const listItem = await getListItemByValue({ listId, ip, listsItemsIndex, clusterClient });
  if (listItem == null) {
    return null;
  } else {
    const response: UpdateResponse = await clusterClient.callAsCurrentUser('update', {
      index: listsItemsIndex,
      id: listItem.id,
      body: { doc: { ip } },
    });
    return {
      id: response._id,
      list_id: listItem.list_id,
      ip: ip ?? listItem.ip,
      created_at: listItem.created_at,
      // TODO: Add the rest of the elements such as updatedAt
    };
  }
};
