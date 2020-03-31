/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsSchema } from '../routes/schemas/response/lists_schema';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { SearchResponse } from '../../types';

export const getList = async ({
  id,
  clusterClient,
  listsIndex,
}: {
  id: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsIndex: string;
}): Promise<ListsSchema | null> => {
  if (id.trim() === '') {
    return null;
  } else {
    const result: SearchResponse<Omit<ListsSchema, 'id'>> = await clusterClient.callAsCurrentUser(
      'search',
      {
        body: {
          query: {
            term: {
              _id: id,
            },
          },
        },
        index: listsIndex,
        ignoreUnavailable: true,
      }
    );
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
