/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { SearchResponse } from '../../types';
import { transformElasticToListsItems } from './transform_elastic_to_list_items';
import { getQueryFilterFromTypeValue } from './get_query_filter_from_type_value';
import { ElasticReturnType } from './types';
import { Type } from '../routes/schemas/common/schemas';

export const getListItemsByValues = async ({
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
  value: string[];
}): Promise<ListsItemsSchema[]> => {
  // TODO: Move the check for trim above this and remove it below. It shouldn't be here but rather a validation check above.
  if (listId.trim() === '') {
    return [];
  } else {
    const response: SearchResponse<ElasticReturnType> = await clusterClient.callAsCurrentUser(
      'search',
      {
        index: listsItemsIndex,
        ignoreUnavailable: true,
        body: {
          query: {
            bool: {
              filter: getQueryFilterFromTypeValue({ listId, type, value }),
            },
          },
        },
        size: value.length,
      }
    );
    return transformElasticToListsItems({ response, type });
  }
};
