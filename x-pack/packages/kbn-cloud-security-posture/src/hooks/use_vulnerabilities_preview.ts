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
} from '@kbn/cloud-security-posture-common';
import type { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps, UseCspOptions } from '../../type';
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

const getVulnerabilitiesQuery = ({ query }: UseCspOptions, isPreview = false) => ({
  index: CDR_VULNERABILITIES_INDEX_PATTERN,
  size: 0,
  aggs: getFindingsCountAggQueryVulnerabilities(),
  ignore_unavailable: true,
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

export const useVulnerabilitiesPreview = (options: UseCspOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  return useQuery(
    ['csp_vulnerabilities_preview', { params: options }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getVulnerabilitiesQuery(options),
        })
      );

      return {
        count: getVulnerabilitiesAggregationCount(aggregations?.count?.buckets),
      };
    },
    {
      keepPreviousData: true,
      enabled: options.enabled,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
