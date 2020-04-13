/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { ListsItemsSchema } from '../schemas/response/lists_items_schema';
import { getListItemsByValues } from './get_list_items_by_values';
import { Type } from '../schemas/common/schemas';

export const getListItemByValue = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  type,
  value,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  type: Type;
  value: string;
}): Promise<ListsItemsSchema | null> => {
  // TODO: Move this listId.trim() check above here to within the API boundary
  if (listId.trim() === '') {
    return null;
  } else {
    const listItems = await getListItemsByValues({
      listId,
      clusterClient,
      listsItemsIndex,
      type,
      value: [value],
    });
    if (listItems.length) {
      return listItems[0];
    } else {
      return null;
    }
  }
};
