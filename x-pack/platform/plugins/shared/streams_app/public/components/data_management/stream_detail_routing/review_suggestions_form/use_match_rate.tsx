/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import type { Streams } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { map, switchAll, catchError, of, startWith, filter } from 'rxjs';
import { useAbortController } from '@kbn/react-hooks';
import { isNumber } from 'lodash';
import type { ReviewSuggestionsInputs } from './use_review_suggestions_form';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  buildDocumentCountSearchParams,
  buildDocumentCountProbabilitySearchParams,
} from '../state_management/stream_routing_state_machine/routing_samples_state_machine';

export function useMatchRate(
  definition: Streams.WiredStream.GetResponse,
  partition: ReviewSuggestionsInputs['suggestions'][number],
  start: number,
  end: number
) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const abortController = useAbortController();

  const search$ = useMemo(() => {
    return data.search
      .search(
        {
          params: buildDocumentCountSearchParams({
            definition,
            start,
            end,
          }),
        },
        { abortSignal: abortController.signal }
      )
      .pipe(
        map((countResult) => {
          const docCount =
            !countResult.rawResponse.hits.total || isNumber(countResult.rawResponse.hits.total)
              ? countResult.rawResponse.hits.total
              : countResult.rawResponse.hits.total.value;

          if (!docCount) {
            return of(0);
          }

          return data.search
            .search(
              {
                params: buildDocumentCountProbabilitySearchParams({
                  definition,
                  condition: partition.condition,
                  docCount,
                  start,
                  end,
                }),
              },
              { abortSignal: abortController.signal }
            )
            .pipe(
              map((probabilityResult) => {
                if (probabilityResult.rawResponse.aggregations) {
                  // We need to divide this by the sampling / probability factor:
                  // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-random-sampler-aggregation.html#random-sampler-special-cases
                  const sampleAgg = probabilityResult.rawResponse.aggregations.sample as {
                    doc_count: number;
                    probability: number;
                    matching_docs: { doc_count: number };
                  };
                  const randomSampleDocCount = sampleAgg.doc_count / sampleAgg.probability;
                  const matchingDocCount = sampleAgg.matching_docs.doc_count;

                  return matchingDocCount / randomSampleDocCount;
                }

                return undefined;
              }),
              filter((matchRate): matchRate is number => matchRate !== undefined)
            );
        }),
        switchAll(),
        map((matchRate) => {
          return {
            value: matchRate,
            loading: false,
            error: undefined,
          };
        }),
        startWith({
          value: undefined,
          loading: true,
          error: undefined,
        }),
        catchError((error) => [
          {
            value: undefined,
            loading: false,
            error,
          },
        ])
      );
  }, [definition, partition.condition, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  return useObservable(search$, { value: undefined, loading: true, error: undefined });
}
