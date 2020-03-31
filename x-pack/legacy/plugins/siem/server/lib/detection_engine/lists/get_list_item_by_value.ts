/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { SearchResponse } from '../../types';

// TODO: Should this just call get_list_item_by_values with a single value now?
export const getListItemByValue = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  ip,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  // TODO: Make all values work and not just ip here
  ip: string | undefined;
}): Promise<ListsItemsSchema | null> => {
  if (listId.trim() === '') {
    return null;
  } else {
    const result: SearchResponse<Omit<
      ListsItemsSchema,
      'id'
    >> = await clusterClient.callAsCurrentUser('search', {
      index: listsItemsIndex,
      ignoreUnavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  list_id: listId,
                },
              },
              {
                term: {
                  ip,
                },
              },
            ],
          },
        },
      },
    });
    if (result.hits.hits.length) {
      return {
        id: result.hits.hits[0]._id,
        ...result.hits.hits[0]._source,
      };
    } else {
      return null;
    }
  }
};
