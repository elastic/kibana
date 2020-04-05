/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough } from 'stream';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
// TODO: There is a definitely typed version of SearchResponse. Should we migrate to that and not use this type anymore?
import { SearchResponse } from '../../types';
import { ElasticReturnType } from './types';

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
  stringToAppend,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  stream: PassThrough;
  stringToAppend?: string | null;
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
      stringToAppend,
    });
    while (searchAfter != null) {
      searchAfter = await writeNextResponse({
        listId,
        clusterClient,
        stream,
        listsItemsIndex,
        searchAfter,
        stringToAppend,
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
  stringToAppend,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  stream: PassThrough;
  searchAfter: string[] | undefined;
  stringToAppend: string | null | undefined;
}): Promise<string[] | undefined> => {
  const response = await getResponse({
    clusterClient,
    searchAfter,
    listId,
    listsItemsIndex,
  });

  if (response.hits.hits.length) {
    writeResponseHitsToStream({ response, stream, stringToAppend });
    return getSearchAfterFromResponse({ response });
  } else {
    // return void;
  }
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
}): Promise<SearchResponse<ElasticReturnType>> => {
  return clusterClient.callAsCurrentUser('search', {
    index: listsItemsIndex,
    ignoreUnavailable: true,
    body: {
      query: {
        term: {
          list_id: listId,
        },
      },
      sort: [{ tie_breaker_id: 'asc' }],
      search_after: searchAfter,
    },
    size,
  });
};

export const writeResponseHitsToStream = ({
  response,
  stream,
  stringToAppend,
}: {
  response: SearchResponse<ElasticReturnType>;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}) => {
  response.hits.hits.forEach(hit => {
    if (hit._source.ip != null) {
      stream.push(hit._source.ip);
    } else if (hit._source.keyword != null) {
      stream.push(hit._source.keyword);
    } else {
      // this is an error
      // TODO: Should we do something here?
    }
    if (stringToAppend != null) {
      stream.push(stringToAppend);
    }
  });
};
