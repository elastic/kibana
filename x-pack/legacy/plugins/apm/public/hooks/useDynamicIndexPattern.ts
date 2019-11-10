/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { useFetcher } from './useFetcher';

export function useDynamicIndexPattern(
  processorEvent: 'transaction' | 'metric' | 'error' | undefined
) {
  const { data, status } = useFetcher(
    callApmApi => {
      return callApmApi({
        pathname: '/api/apm/index_pattern/dynamic',
        forceCache: true,
        params: {
          query: {
            processorEvent
          }
        }
      });
    },
    [processorEvent]
  );

  return {
    indexPattern: idx(data, _ => _.dynamicIndexPattern),
    status
  };
}
