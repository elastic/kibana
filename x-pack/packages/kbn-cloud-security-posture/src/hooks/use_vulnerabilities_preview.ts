/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import {
  SearchRequest,
  SearchResponse,
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CDR_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
  MAX_FINDINGS_TO_LOAD,
} from '@kbn/cloud-security-posture-common';
import type { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps, UseMisconfigurationOptions } from '../../type';
import { showErrorToast } from '../..';
import {
  getFindingsCountAggQueryVulnerabilities,
  getVulnerabilitiesAggregationCount,
} from '../utils/hooks_utils';

type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  SearchResponse<CspVulnerabilityFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}

export const getVulnerabilitiesQuery = (
  { query }: UseMisconfigurationOptions,
  isPreview = false
) => ({
  index: CDR_VULNERABILITIES_INDEX_PATTERN,
  size: MAX_FINDINGS_TO_LOAD,
  aggs: getFindingsCountAggQueryVulnerabilities(),
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter ?? []),
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_VULNERABILITIES_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  },
});

export const useVulnerabilitiesPreview = (options: UseMisconfigurationOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  /**
   * We're using useInfiniteQuery in this case to allow the user to fetch more data (if available and up to 10k)
   * useInfiniteQuery differs from useQuery because it accumulates and caches a chunk of data from the previous fetches into an array
   * it uses the getNextPageParam to know if there are more pages to load and retrieve the position of
   * the last loaded record to be used as a from parameter to fetch the next chunk of data.
   */
  return useQuery(
    ['csp_vulnerabilities_preview', { params: options }],
    async ({ pageParam }) => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getVulnerabilitiesQuery(options, pageParam),
        })
      );
      return {
        count: getVulnerabilitiesAggregationCount(aggregations?.count?.buckets),
      };
    },
    {
      staleTime: 5000,
      keepPreviousData: true,
      enabled: options.enabled,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
