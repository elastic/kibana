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

interface UseMisconfigurationPreviewOptions extends MisconfigurationPreviewBaseEsQuery {
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

const RESULT_EVALUATION = {
  PASSED: 'passed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

export const getFindingsCountAggQueryMisconfigurationPreview = () => ({
  count: {
    filters: {
      other_bucket_key: RESULT_EVALUATION.UNKNOWN,
      filters: {
        [RESULT_EVALUATION.PASSED]: { match: { 'result.evaluation': RESULT_EVALUATION.PASSED } },
        [RESULT_EVALUATION.FAILED]: { match: { 'result.evaluation': RESULT_EVALUATION.FAILED } },
      },
    },
  },
});

export const getMisconfigurationAggregationCount = (
  buckets: estypes.AggregationsBuckets<estypes.AggregationsStringRareTermsBucketKeys>
) => {
  return Object.entries(buckets).reduce(
    (evaluation, [key, value]) => {
      evaluation[key] = (evaluation[key] || 0) + (value.doc_count || 0);
      return evaluation;
    },
    {
      [RESULT_EVALUATION.PASSED]: 0,
      [RESULT_EVALUATION.FAILED]: 0,
      [RESULT_EVALUATION.UNKNOWN]: 0,
    }
  );
};

export const buildMisconfigurationsFindingsQuery = (
  { query }: UseMisconfigurationPreviewOptions,
  rulesStates: CspBenchmarkRulesStates
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    size: 0,
    aggs: getFindingsCountAggQueryMisconfigurationPreview(),
    ignore_unavailable: false,
    query: buildMisconfigurationsFindingsQueryWithFilters(query, mutedRulesFilterQuery),
  };
};

const buildMisconfigurationsFindingsQueryWithFilters = (
  query: UseMisconfigurationPreviewOptions['query'],
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

export const useMisconfigurationPreview = (options: UseMisconfigurationPreviewOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  return useQuery(
    ['csp_misconfiguration_preview', { params: options }, rulesStates],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: buildMisconfigurationsFindingsQuery(options, rulesStates!),
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be defined');

      return {
        count: getMisconfigurationAggregationCount(aggregations.count.buckets),
      };
    },
    {
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
