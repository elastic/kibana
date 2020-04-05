/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getListItemsByValues } from './get_list_items_by_values';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { getQueryFilterFromTypeValue } from './get_query_filter_from_type_value';

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  type: string; // TODO: Use enum here
  value: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<ListsItemsSchema[] | null> => {
  // TODO: Check before we call into these functions at the validation level that the string is not empty?
  if (listId.trim() === '') {
    return null;
  } else {
    const listItems = await getListItemsByValues({
      type,
      value: [value],
      listId,
      clusterClient,
      listsItemsIndex,
    });
    const values = listItems.map(listItem => listItem.value);
    const filter = getQueryFilterFromTypeValue({
      type,
      value: values,
      listId,
    });
    await clusterClient.callAsCurrentUser('deleteByQuery', {
      index: listsItemsIndex,
      body: {
        query: {
          bool: {
            filter,
          },
        },
      },
    });
    return listItems;
  }
};
