/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { CreateResponse } from '../../types';

export const createListItem = async ({
  listId,
  ip,
  id,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  id: string | undefined;
  ip: string | undefined;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema> => {
  // TODO: Do something with the undefined ip above?
  const createdAt = new Date().toISOString();
  const response: CreateResponse = await clusterClient.callAsCurrentUser('index', {
    index: listsItemsIndex,
    id,
    body: { list_id: listId, ip, created_at: createdAt },
  });
  return {
    id: response._id,
    ip,
    list_id: listId,
    created_at: createdAt,
    // TODO: Add the rest of the elements
  };
};
