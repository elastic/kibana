/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ecsFieldMap, alertFieldMap } from '@kbn/alerts-as-data-utils';

export function checkForShardFailures(searchResult: SearchResponse<unknown>): string | undefined {
  const anyShardsFailed = searchResult?._shards?.failed ?? 0;
  if (anyShardsFailed > 0) {
    const errorMessage =
      searchResult?._shards?.failures?.[0]?.reason?.reason ||
      'Search returned partial results due to shard failures.';
    return errorMessage;
  }

  const anyClustersSkipped = searchResult?._clusters?.skipped ?? 0;
  if (anyClustersSkipped) {
    const details = searchResult?._clusters?.details ?? {};
    for (const detail of Object.values(details)) {
      const errorMessage =
        detail?.failures?.[0]?.reason?.caused_by?.reason ||
        'Search returned partial results due to skipped cluster errors.';
      return errorMessage;
    }
  }
}

export const getSourceFields = () => {
  const alertFields = Object.keys(alertFieldMap);
  return (
    Object.keys(ecsFieldMap)
      // exclude the alert fields that we don't want to override
      .filter((key) => !alertFields.includes(key))
      .map((key) => ({
        label: key,
        searchPath: key,
      }))
  );
};
