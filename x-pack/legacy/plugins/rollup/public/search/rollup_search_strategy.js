/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { SearchError, getSearchErrorType } from 'ui/courier';

function getAllFetchParams(searchRequests, Promise) {
  return Promise.map(searchRequests, searchRequest => {
    return Promise.try(searchRequest.getFetchParams, void 0, searchRequest)
      .then(fetchParams => {
        return (searchRequest.fetchParams = fetchParams);
      })
      .then(value => ({ resolved: value }))
      .catch(error => ({ rejected: error }));
  });
}

function serializeAllFetchParams(fetchParams, searchRequests) {
  const searchRequestsWithFetchParams = [];
  const failedSearchRequests = [];

  // Gather the fetch param responses from all the successful requests.
  fetchParams.forEach((result, index) => {
    if (result.resolved) {
      searchRequestsWithFetchParams.push(result.resolved);
    } else {
      const searchRequest = searchRequests[index];

      searchRequest.handleFailure(result.rejected);
      failedSearchRequests.push(searchRequest);
    }
  });

  const serializedFetchParams = serializeFetchParams(searchRequestsWithFetchParams);

  return {
    serializedFetchParams,
    failedSearchRequests,
  };
}

function serializeFetchParams(searchRequestsWithFetchParams) {
  return JSON.stringify(
    searchRequestsWithFetchParams.map(searchRequestWithFetchParams => {
      const indexPattern =
        searchRequestWithFetchParams.index.title || searchRequestWithFetchParams.index;
      const {
        body: { size, aggs, query: _query },
      } = searchRequestWithFetchParams;

      const query = {
        size: size,
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
function shimHitsInFetchResponse(response) {
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

export const rollupSearchStrategy = {
  id: 'rollup',

  search: async ({ searchRequests, Promise }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = await getAllFetchParams(searchRequests, Promise);

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const { serializedFetchParams, failedSearchRequests } = await serializeAllFetchParams(
      allFetchParams,
      searchRequests
    );

    const controller = new AbortController();
    const promise = kfetch({
      signal: controller.signal,
      pathname: '../api/rollup/search',
      method: 'POST',
      body: serializedFetchParams,
    });

    return {
      searching: promise.then(shimHitsInFetchResponse).catch(error => {
        const {
          body: { statusText, error: title, message },
          res: { url },
        } = error;

        // Format kfetch error as a SearchError.
        const searchError = new SearchError({
          status: statusText,
          title,
          message: `Rollup search error: ${message}`,
          path: url,
          type: getSearchErrorType({ message }),
        });

        return Promise.reject(searchError);
      }),
      abort: () => controller.abort(),
      failedSearchRequests,
    };
  },

  isViable: indexPattern => {
    if (!indexPattern) {
      return false;
    }

    return indexPattern.type === 'rollup';
  },
};
