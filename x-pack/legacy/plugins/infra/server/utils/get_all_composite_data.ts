/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraDatabaseSearchResponse,
} from '../lib/adapters/framework';

export const getAllCompositeData = async <
  Aggregation = undefined,
  Bucket = {},
  Options extends object = {}
>(
  framework: InfraBackendFrameworkAdapter,
  request: InfraFrameworkRequest,
  options: Options,
  bucketSelector: (response: InfraDatabaseSearchResponse<{}, Aggregation>) => Bucket[],
  onAfterKey: (options: Options, response: InfraDatabaseSearchResponse<{}, Aggregation>) => Options,
  previousBuckets: Bucket[] = []
): Promise<Bucket[]> => {
  const response = await framework.callWithRequest<{}, Aggregation>(request, 'search', options);

  // Nothing available, return the previous buckets.
  if (response.hits.total.value === 0) {
    return previousBuckets;
  }

  // if ES doesn't return an aggregations key, something went seriously wrong.
  if (!response.aggregations) {
    throw new Error('Whoops!, `aggregations` key must always be returned.');
  }

  const currentBuckets = bucketSelector(response);

  // if there are no currentBuckets then we are finished paginating through the results
  if (currentBuckets.length === 0) {
    return previousBuckets;
  }

  // There is possibly more data, concat previous and current buckets and call ourselves recursively.
  const newOptions = onAfterKey(options, response);
  return getAllCompositeData(
    framework,
    request,
    newOptions,
    bucketSelector,
    onAfterKey,
    previousBuckets.concat(currentBuckets)
  );
};
