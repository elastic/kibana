/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getListItem } from './get_list_item';
import { ListsItemsSchema } from '../schemas/response/lists_items_schema';

export const deleteListItem = async ({
  id,
  clusterClient,
  listsItemsIndex,
}: {
  id: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema | null> => {
  const listItem = await getListItem({ id, clusterClient, listsItemsIndex });
  if (listItem == null) {
    return null;
  } else {
    await clusterClient.callAsCurrentUser('delete', {
      index: listsItemsIndex,
      id,
    });
  }
  return listItem;
};
