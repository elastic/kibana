/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
  CspFinding,
} from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { buildMutedRulesFilter } from '@kbn/cloud-security-posture-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { showErrorToast } from '../..';
import type { CspClientPluginStartDeps } from '../../type';

import { useGetCspBenchmarkRulesStatesApi } from './use_get_benchmark_rules_state_api';

interface MisconfigurationPreviewBaseEsQuery {
  query?: {
    bool: {
      filter: estypes.QueryDslQueryContainer[];
    };
  };
}

interface UseFindingsOptions extends MisconfigurationPreviewBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsCountAggQueryMisconfigurationPreview = () => ({
  count: {
    filters: {
      other_bucket_key: 'other_messages',
      filters: {
        passed: { match: { 'result.evaluation': 'passed' } },
        failed: { match: { 'result.evaluation': 'failed' } },
      },
    },
  },
});

export const getMisconfigurationAggregationCount = (
  buckets: Array<estypes.AggregationsStringRareTermsBucketKeys | undefined>
) => {
  const passed = buckets.find((bucket) => bucket?.key === 'passed');
  const failed = buckets.find((bucket) => bucket?.key === 'failed');
  const noStatus = buckets.find((bucket) => bucket?.key === 'other_messages');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
    no_status: noStatus?.doc_count || 0,
  };
};

export const buildMisconfigurationsFindingsQuery = (
  { query }: UseFindingsOptions,
  rulesStates: CspBenchmarkRulesStates
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    size: 500,
    aggs: getFindingsCountAggQueryMisconfigurationPreview(),
    ignore_unavailable: false,
    query: buildMisconfigurationsFindingsQueryWithFilters(query, mutedRulesFilterQuery),
  };
};

const buildMisconfigurationsFindingsQueryWithFilters = (
  query: UseFindingsOptions['query'],
  mutedRulesFilterQuery: estypes.QueryDslQueryContainer[]
) => {
  return {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter ?? []),
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
      must_not: [...mutedRulesFilterQuery],
    },
  };
};

export const useMisconfigurationFindings = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  return useQuery(
    ['csp_misconfiguration_preview', { params: options }, rulesStates],
    async () => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: buildMisconfigurationsFindingsQuery(options, rulesStates!),
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be defined');

      return {
        count: getMisconfigurationAggregationCount(
          Object.entries(aggregations.count.buckets).map(([key, value]) => ({
            key,
            doc_count: value.doc_count || 0,
          }))
        ),
        rows: hits.hits.map((finding) => ({
          result: finding._source?.result,
          rule: finding?._source?.rule,
          resource: finding?._source?.resource,
        })) as Array<Pick<CspFinding, 'result' | 'rule' | 'resource'>>,
      };
    },
    {
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
