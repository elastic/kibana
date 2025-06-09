/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { WatcherQueryWatch } from '@elastic/elasticsearch/lib/api/types';
import { QUERY_WATCHES_PAGINATION } from "@kbn/watcher-plugin/common/constants";

/**
 * Fetches all watches using the Query Watches API.
 * It uses pagination via the `from` and `size` parameters to retrieve all available watches,
 * accumulating them across multiple requests.
 */
export const fetchWatchesWithPagination = async (
  dataClient: IScopedClusterClient,
  pageSize: number
): Promise<WatcherQueryWatch[]> => {
  let from = 0;
  const allWatches: WatcherQueryWatch[] = [];

  let total = Infinity;

  while (allWatches.length < total && from + pageSize <= QUERY_WATCHES_PAGINATION.MAX_RESULT_WINDOW) {
    const response = await dataClient.asCurrentUser.watcher.queryWatches({
      from,
      size: pageSize,
    });

    const watches = response?.watches ?? [];
    allWatches.push(...watches);

    // Update total in case new watches have been created in the meantime
    total = response?.count ?? 0;

    from += pageSize;

    // Early break in case something went wrong with count logic to avoid an infinite loop
    if (watches.length === 0) break;
  }

  return allWatches;
};
