/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef, useMemo, useReducer } from 'react';
import type { Subscription } from 'rxjs';
import { map } from 'rxjs';
import { chunk } from 'lodash';
import type {
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
} from '@kbn/search-types';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { getProcessedFields } from '@kbn/ml-data-grid';
import { isDefined } from '@kbn/ml-is-defined';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useDataVisualizerKibana } from '../../kibana_context';
import type {
  AggregatableFieldOverallStats,
  NonAggregatableFieldOverallStats,
} from '../search_strategy/requests/overall_stats';
import {
  checkAggregatableFieldsExistRequest,
  checkNonAggregatableFieldExistsRequest,
  getSampleOfDocumentsForNonAggregatableFields,
  isAggregatableFieldOverallStats,
  isNonAggregatableFieldOverallStats,
  isNonAggregatableSampledDocs,
  isUnsupportedVectorField,
  processAggregatableFieldsExistResponse,
  processNonAggregatableFieldsExistResponse,
} from '../search_strategy/requests/overall_stats';
import type { OverallStats } from '../types/overall_stats';
import type {
  DataStatsFetchProgress,
  OverallStatsSearchStrategyParams,
} from '../../../../common/types/field_stats';
import { isRandomSamplingOption } from '../../../../common/types/field_stats';
import { getDocumentCountStats } from '../search_strategy/requests/get_document_stats';
import { getInitialProgress, getReducer } from '../progress_utils';
import {
  getDefaultPageState,
  MAX_CONCURRENT_REQUESTS,
} from '../constants/index_data_visualizer_viewer';
import { displayError } from '../../common/util/display_error';
import {
  fetchDataWithTimeout,
  rateLimitingForkJoin,
} from '../search_strategy/requests/fetch_utils';
import { buildFilterCriteria } from '../../../../common/utils/build_query_filters';

const getPopulatedFieldsInIndex = (
  populatedFieldsInIndexWithoutRuntimeFields: Set<string> | undefined | null,
  runtimeFieldMap: MappingRuntimeFields | undefined
): Set<string> | undefined | null => {
  if (!populatedFieldsInIndexWithoutRuntimeFields) return undefined;
  const runtimeFields = runtimeFieldMap ? Object.keys(runtimeFieldMap) : undefined;
  return runtimeFields && runtimeFields?.length > 0
    ? new Set([...Array.from(populatedFieldsInIndexWithoutRuntimeFields), ...runtimeFields])
    : populatedFieldsInIndexWithoutRuntimeFields;
};

export function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(
  esql = false,
  searchStrategyParams: TParams | undefined,
  lastRefresh: number,
  probability?: number | null
): {
  progress: DataStatsFetchProgress;
  overallStats: OverallStats;
} {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [stats, setOverallStats] = useState<OverallStats>(getDefaultPageState().overallStats);
  const [populatedFieldsInIndexWithoutRuntimeFields, setPopulatedFieldsInIndex] = useState<
    | Set<string>
    // request to fields caps has not been made yet
    | undefined
    // null is set when field caps api is too slow, and we should not retry anymore
    | null
  >();

  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const populatedFieldsAbortCtrl = useRef(new AbortController());

  const searchSubscription$ = useRef<Subscription>();

  useEffect(
    function updatePopulatedFields() {
      let unmounted = false;

      // If null, that means we tried to fetch populated fields already but it timed out
      // so don't try again
      if (!searchStrategyParams || populatedFieldsInIndexWithoutRuntimeFields === null) return;

      const { index, searchQuery, timeFieldName, earliest, latest } = searchStrategyParams;

      const fetchPopulatedFields = async () => {
        populatedFieldsAbortCtrl.current.abort();
        populatedFieldsAbortCtrl.current = new AbortController();

        // Trick to avoid duplicate getFieldsForWildcard requests
        // wouldn't make sense to make time-based query if either earliest & latest timestamps is undefined
        if (timeFieldName !== undefined && (earliest === undefined || latest === undefined)) {
          return;
        }

        const filterCriteria = buildFilterCriteria(timeFieldName, earliest, latest, searchQuery);

        // Getting non-empty fields for the index pattern
        // because then we can absolutely exclude these from subsequent requests
        const nonEmptyFields = await fetchDataWithTimeout<Promise<FieldSpec[]>>(
          data.dataViews.getFieldsForWildcard({
            pattern: index,
            indexFilter: {
              bool: {
                filter: filterCriteria,
              },
            },
            includeEmptyFields: false,
          }),
          populatedFieldsAbortCtrl.current
        );

        if (!unmounted) {
          if (Array.isArray(nonEmptyFields)) {
            setPopulatedFieldsInIndex(new Set([...nonEmptyFields.map((field) => field.name)]));
          } else {
            setPopulatedFieldsInIndex(null);
          }
        }
      };

      fetchPopulatedFields();

      return () => {
        unmounted = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      searchStrategyParams?.timeFieldName,
      searchStrategyParams?.earliest,
      searchStrategyParams?.latest,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify({ query: searchStrategyParams?.searchQuery }),
      searchStrategyParams?.index,
    ]
  );

  const startFetch = useCallback(async () => {
    try {
      searchSubscription$.current?.unsubscribe();
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      if (
        !searchStrategyParams ||
        lastRefresh === 0 ||
        populatedFieldsInIndexWithoutRuntimeFields === undefined
      ) {
        return;
      }

      const populatedFieldsInIndex = getPopulatedFieldsInIndex(
        populatedFieldsInIndexWithoutRuntimeFields,
        searchStrategyParams.runtimeFieldMap
      );

      setFetchState({
        ...getInitialProgress(),
        isRunning: true,
        error: undefined,
      });

      const {
        aggregatableFields: originalAggregatableFields,
        nonAggregatableFields: originalNonAggregatableFields,
        index,
        searchQuery,
        timeFieldName,
        earliest,
        latest,
        runtimeFieldMap,
        samplingOption,
        sessionId,
        embeddableExecutionContext,
      } = searchStrategyParams;

      const searchOptions: ISearchOptions = {
        abortSignal: abortCtrl.current.signal,
        sessionId,
        ...(embeddableExecutionContext ? { executionContext: embeddableExecutionContext } : {}),
      };

      const hasPopulatedFieldsInfo = isDefined(populatedFieldsInIndex);
      const aggregatableFields = hasPopulatedFieldsInfo
        ? originalAggregatableFields.filter((field) => populatedFieldsInIndex.has(field.name))
        : originalAggregatableFields;
      const nonAggregatableFields = hasPopulatedFieldsInfo
        ? originalNonAggregatableFields.filter((fieldName) => populatedFieldsInIndex.has(fieldName))
        : originalNonAggregatableFields;
      const supportedNonAggregatableFields = nonAggregatableFields.filter((fieldName) => {
        return !isUnsupportedVectorField(fieldName);
      });

      const documentCountStats = await getDocumentCountStats(
        data.search,
        searchStrategyParams,
        searchOptions,
        samplingOption.seed,
        probability
      );

      const nonAggregatableFieldsExamplesObs = data.search
        .search<IKibanaSearchRequest, IKibanaSearchResponse>(
          {
            params: getSampleOfDocumentsForNonAggregatableFields(
              supportedNonAggregatableFields,
              index,
              searchQuery,
              timeFieldName,
              earliest,
              latest,
              runtimeFieldMap
            ),
          },
          searchOptions
        )
        .pipe(
          map((resp) => {
            return resp as IKibanaSearchResponse;
          })
        );

      const nonAggregatableFieldsObs = supportedNonAggregatableFields.map((fieldName: string) =>
        data.search
          .search<IKibanaSearchRequest, IKibanaSearchResponse>(
            {
              params: checkNonAggregatableFieldExistsRequest(
                index,
                searchQuery,
                fieldName,
                timeFieldName,
                earliest,
                latest,
                runtimeFieldMap
              ),
            },
            searchOptions
          )
          .pipe(
            map((resp) => {
              return {
                ...resp,
                rawResponse: { ...resp.rawResponse, fieldName },
              } as IKibanaSearchResponse;
            })
          )
      );

      // Have to divide into smaller requests to avoid 413 payload too large
      const aggregatableFieldsChunks = chunk(aggregatableFields, 30);

      if (isRandomSamplingOption(samplingOption)) {
        samplingOption.probability = documentCountStats.probability ?? 1;
      }
      const aggregatableOverallStatsObs = aggregatableFieldsChunks.map((aggregatableFieldsChunk) =>
        data.search
          .search(
            {
              params: checkAggregatableFieldsExistRequest(
                index,
                searchQuery,
                aggregatableFieldsChunk,
                samplingOption,
                timeFieldName,
                earliest,
                latest,
                undefined,
                runtimeFieldMap
              ),
            },
            searchOptions
          )
          .pipe(
            map((resp) => {
              return {
                ...resp,
                aggregatableFields: aggregatableFieldsChunk,
              } as AggregatableFieldOverallStats;
            })
          )
      );

      const sub = rateLimitingForkJoin<
        AggregatableFieldOverallStats | NonAggregatableFieldOverallStats | undefined
      >(
        [
          nonAggregatableFieldsExamplesObs,
          ...aggregatableOverallStatsObs,
          ...nonAggregatableFieldsObs,
        ],
        MAX_CONCURRENT_REQUESTS
      );

      searchSubscription$.current = sub.subscribe({
        next: (value) => {
          const aggregatableOverallStatsResp: AggregatableFieldOverallStats[] = [];
          const nonAggregatableOverallStatsResp: NonAggregatableFieldOverallStats[] = [];

          let sampledNonAggregatableFieldsExamples: Array<{ [key: string]: string }> | undefined;
          value.forEach((resp, idx) => {
            if (idx === 0 && isNonAggregatableSampledDocs(resp)) {
              const docs = resp.rawResponse.hits.hits.map((d) =>
                d.fields ? getProcessedFields(d.fields) : {}
              );
              sampledNonAggregatableFieldsExamples = docs;
            }
            if (isAggregatableFieldOverallStats(resp)) {
              aggregatableOverallStatsResp.push(resp);
            }

            if (isNonAggregatableFieldOverallStats(resp)) {
              nonAggregatableOverallStatsResp.push(resp);
            }
          });

          const totalCount = documentCountStats?.totalCount ?? 0;

          const aggregatableOverallStats = processAggregatableFieldsExistResponse(
            aggregatableOverallStatsResp,
            originalAggregatableFields,
            populatedFieldsInIndex
          );

          const nonAggregatableFieldsCount: number[] = new Array(nonAggregatableFields.length).fill(
            0
          );
          const nonAggregatableFieldsUniqueCount = nonAggregatableFields.map(
            () => new Set<string>()
          );
          if (sampledNonAggregatableFieldsExamples) {
            sampledNonAggregatableFieldsExamples.forEach((doc) => {
              nonAggregatableFields.forEach((field, fieldIdx) => {
                if (Object.hasOwn(doc, field)) {
                  nonAggregatableFieldsCount[fieldIdx] += 1;
                  nonAggregatableFieldsUniqueCount[fieldIdx].add(doc[field]!);
                }
              });
            });
          }
          const nonAggregatableOverallStats = processNonAggregatableFieldsExistResponse(
            nonAggregatableOverallStatsResp,
            originalNonAggregatableFields,
            nonAggregatableFieldsCount,
            nonAggregatableFieldsUniqueCount,
            nonAggregatableFields
          );

          setOverallStats({
            documentCountStats,
            ...nonAggregatableOverallStats,
            ...aggregatableOverallStats,
            totalCount,
          });
        },
        error: (error) => {
          if (error.name !== 'AbortError') {
            displayError(toasts, searchStrategyParams.index, extractErrorProperties(error));
          }

          setFetchState({
            isRunning: false,
            error,
          });
        },
        complete: () => {
          setFetchState({
            loaded: 100,
            isRunning: false,
          });
        },
      });
    } catch (error) {
      // An `AbortError` gets triggered when a user cancels a request by navigating away, we need to ignore these errors.
      if (error.name !== 'AbortError') {
        displayError(toasts, searchStrategyParams!.index, extractErrorProperties(error));
      }
    }
  }, [
    data,
    searchStrategyParams,
    toasts,
    lastRefresh,
    probability,
    populatedFieldsInIndexWithoutRuntimeFields,
  ]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current?.abort();
    populatedFieldsAbortCtrl.current?.abort();
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
  }, [startFetch]);

  useEffect(() => {
    return cancelFetch;
  }, [cancelFetch]);

  return useMemo(
    () => ({
      progress: fetchState,
      overallStats: stats,
    }),
    [stats, fetchState]
  );
}
