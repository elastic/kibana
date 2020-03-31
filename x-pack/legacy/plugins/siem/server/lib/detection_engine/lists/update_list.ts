/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { UpdateResponse } from '../../types';
import { ListsSchema } from '../routes/schemas/response/lists_schema';
import { getList } from './get_list';

export const updateList = async ({
  id,
  name,
  description,
  clusterClient,
  listsIndex,
}: {
  id: string;
  name: string | null | undefined;
  description: string | null | undefined;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsIndex: string;
}): Promise<ListsSchema | null> => {
  // TODO Implement updatedAt from below
  // const updatedAt = new Date().toISOString();
  const list = await getList({ id, clusterClient, listsIndex });
  if (list == null) {
    return null;
  } else {
    const response: UpdateResponse = await clusterClient.callAsCurrentUser('update', {
      index: listsIndex,
      id,
      body: { doc: { name, description } },
    });
    return {
      id: response._id,
      name: name ?? list.name,
      description: description ?? list.description,
      created_at: list.created_at,
      // TODO: Add the rest of the elements such as updatedAt
    };
  }
};
