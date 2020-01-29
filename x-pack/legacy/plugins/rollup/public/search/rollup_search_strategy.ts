/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import {
  SearchError,
  getSearchErrorType,
  IIndexPattern,
  SearchStrategyProvider,
  SearchResponse,
  SearchRequest,
} from '../../../../../../src/plugins/data/public';

function serializeFetchParams(searchRequests: SearchRequest[]) {
  return JSON.stringify(
    searchRequests.map(searchRequestWithFetchParams => {
      const indexPattern =
        searchRequestWithFetchParams.index.title || searchRequestWithFetchParams.index;
      const {
        body: { size, aggs, query: _query },
      } = searchRequestWithFetchParams;

      const query = {
        size,
        aggregations: aggs,
        query: _query,
      };

      return { index: indexPattern, query };
    })
  );
}

// Rollup search always returns 0 hits, but visualizations expect search responses
// to return hits > 0, otherwise they do not render. We fake the number of hits here
// by counting the number of aggregation buckets/values returned by rollup search.
function shimHitsInFetchResponse(response: SearchResponse[]) {
  return response.map(result => {
    const buckets = result.aggregations
      ? Object.keys(result.aggregations).reduce((allBuckets, agg) => {
          return allBuckets.concat(
            result.aggregations[agg].buckets || [result.aggregations[agg].value] || []
          );
        }, [])
      : [];
    return buckets && buckets.length
      ? {
          ...result,
          hits: {
            ...result.hits,
            total: buckets.length,
          },
        }
      : result;
  });
}

export const getRollupSearchStrategy = (fetch: HttpSetup['fetch']): SearchStrategyProvider => ({
  id: 'rollup',

  search: ({ searchRequests }) => {
    // Serialize the fetch params into a format suitable for the body of an ES query.
    const serializedFetchParams = serializeFetchParams(searchRequests);

    const controller = new AbortController();
    const promise = fetch('../api/rollup/search', {
      signal: controller.signal,
      method: 'POST',
      body: serializedFetchParams,
    });

    return {
      searching: promise.then(shimHitsInFetchResponse).catch(error => {
        const {
          body: { statusCode, error: title, message },
          res: { url },
        } = error;

        // Format fetch error as a SearchError.
        const searchError = new SearchError({
          status: statusCode,
          title,
          message: `Rollup search error: ${message}`,
          path: url,
          type: getSearchErrorType({ message }) || '',
        });

        return Promise.reject(searchError);
      }),
      abort: () => controller.abort(),
    };
  },

  isViable: (indexPattern: IIndexPattern) => {
    if (!indexPattern) {
      return false;
    }

    return indexPattern.type === 'rollup';
  },
});
