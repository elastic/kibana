/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useMemo } from 'react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { isRunningResponse } from '@kbn/data-plugin/public';

import {
  type CategorizationAdditionalFilter,
  createCategoryRequest,
} from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { processCategoryResults } from '@kbn/aiops-log-pattern-analysis/process_category_results';
import type { CatResponse } from '@kbn/aiops-log-pattern-analysis/types';

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import type { RandomSamplerStorage } from './sampling_menu';
import { RandomSampler } from './sampling_menu';

export type EventRate = Array<{
  key: number;
  docCount: number;
}>;

export function useCategorizeRequest(randomSamplerStorage: RandomSamplerStorage) {
  const { data } = useAiopsAppContext();

  const abortController = useRef(new AbortController());

  const randomSampler = useMemo(
    () => new RandomSampler(randomSamplerStorage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const runCategorizeRequest = useCallback(
    (
      index: string,
      field: string,
      timeField: string,
      timeRange: { from: number; to: number },
      query: QueryDslQueryContainer,
      runtimeMappings: MappingRuntimeFields | undefined,
      intervalMs?: number,
      additionalFilter?: CategorizationAdditionalFilter
    ): Promise<ReturnType<typeof processCategoryResults>> => {
      const { wrap, unwrap } = randomSampler.createRandomSamplerWrapper();

      return new Promise((resolve, reject) => {
        data.search
          .search<ReturnType<typeof createCategoryRequest>, CatResponse>(
            createCategoryRequest(
              index,
              field,
              timeField,
              timeRange,
              query,
              runtimeMappings,
              wrap,
              intervalMs,
              additionalFilter,
              true,
              additionalFilter === undefined // don't include the outer sparkline if there is an additional filter
            ),
            { abortSignal: abortController.current.signal }
          )
          .subscribe({
            next: (result) => {
              if (!isRunningResponse(result)) {
                resolve(processCategoryResults(result, field, unwrap));
              } else {
                // partial results
                // Ignore partial results for now.
                // An issue with the search function means partial results are not being returned correctly.
              }
            },
            error: (error) => {
              if (error.name === 'AbortError') {
                return resolve({ categories: [], hasExamples: false });
              }
              reject(error);
            },
          });
      });
    },
    [data.search, randomSampler]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runCategorizeRequest, cancelRequest, randomSampler };
}
