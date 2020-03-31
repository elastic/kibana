/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough } from 'stream';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
// TODO: There is a definitely typed version of SearchResponse. Should we migrate to that and not use this type anymore?
import { SearchResponse } from '../../types';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';

/**
 * How many results to page through from the network at a time
 * using search_after
 */
export const SIZE = 100;

export const writeListItemsToStream = ({
  listId,
  clusterClient,
  stream,
  listsItemsIndex,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  stream: PassThrough;
}): void => {
  // Use a timeout to start the reading process on the next tick.
  // and prevent the async await from bubbling up to the caller
  setTimeout(async () => {
    let searchAfter = await writeNextResponse({
      listId,
      clusterClient,
      stream,
      listsItemsIndex,
      searchAfter: undefined,
    });
    while (searchAfter != null) {
      searchAfter = await writeNextResponse({
        listId,
        clusterClient,
        stream,
        listsItemsIndex,
        searchAfter,
      });
    }
    stream.end();
  });
};

export const writeNextResponse = async ({
  listId,
  clusterClient,
  stream,
  listsItemsIndex,
  searchAfter,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  stream: PassThrough;
  searchAfter: string[] | undefined;
}): Promise<string[] | undefined> => {
  const response = await getResponse({
    clusterClient,
    searchAfter,
    listId,
    listsItemsIndex,
  });

  if (!response.hits.hits.length) {
    return;
  }

  writeResponseHitsToStream({ response, stream });
  return getSearchAfterFromResponse({ response });
};

export const getSearchAfterFromResponse = <T>({
  response,
}: {
  response: SearchResponse<T>;
}): string[] | undefined => {
  return response.hits.hits[response.hits.hits.length - 1].sort;
};

export const getResponse = async ({
  clusterClient,
  searchAfter,
  listId,
  listsItemsIndex,
  size = SIZE,
}: {
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listId: string;
  searchAfter: undefined | string[];
  listsItemsIndex: string;
  size?: number;
}): Promise<SearchResponse<Omit<ListsItemsSchema, 'id'>>> => {
  return clusterClient.callAsCurrentUser('search', {
    index: listsItemsIndex,
    ignoreUnavailable: true,
    body: {
      query: {
        term: {
          list_id: listId,
        },
      },
      sort: [{ ip: 'asc' }],
      search_after: searchAfter,
    },
    size,
  });
};

export const writeResponseHitsToStream = ({
  response,
  stream,
}: {
  response: SearchResponse<Omit<ListsItemsSchema, 'id'>>;
  stream: PassThrough;
}) => {
  response.hits.hits.forEach(hit => {
    const ip = hit._source.ip;
    stream.push(ip);
    stream.push('\n');
  });
};
