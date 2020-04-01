/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getList } from './get_list';
import { getListItemsByValues } from './get_list_items_by_values';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';

export const deleteListItemByValue = async ({
  listId,
  ip,
  clusterClient,
  listsIndex,
  listsItemsIndex,
}: {
  listId: string;
  ip: string | null | undefined;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsIndex: string;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema[] | null> => {
  if (listId.trim() === '') {
    return null;
  } else {
    const list = await getList({ id: listId, clusterClient, listsIndex });
    if (list == null) {
      return null;
    } else {
      const listItems = await getListItemsByValues({
        ips: ip ? [ip] : [],
        listId,
        clusterClient,
        listsItemsIndex,
      });
      const ips = listItems.map(listItem => listItem.ip).filter(ipFilter => ipFilter != null);
      await clusterClient.callAsCurrentUser('deleteByQuery', {
        index: listsItemsIndex,
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
                  terms: {
                    ip: ips,
                  },
                },
              ],
            },
          },
        },
      });
      // TODO: We don't filter down here like we do above? Issue later?
      return listItems;
    }
  }
};
