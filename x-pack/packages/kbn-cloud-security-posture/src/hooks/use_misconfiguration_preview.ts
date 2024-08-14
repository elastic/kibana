/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
  MAX_FINDINGS_TO_LOAD,
  CspBenchmarkRulesStates,
  CspFinding,
} from '@kbn/cloud-security-posture-common';
import { showErrorToast, buildMutedRulesFilter } from '@kbn/cloud-security-posture-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps } from '../../type';
import type { FindingsBaseEsQuery } from '../../type';
import {
  getFindingsCountAggQueryMisconfigurationPreview,
  getMisconfigurationAggregationCount,
} from '../utils/utils';
import { useGetCspBenchmarkRulesStatesApi } from './use_get_benchmark_rules_state_api';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  sort: any;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsQuery = (
  { query, sort }: UseFindingsOptions,
  rulesStates: CspBenchmarkRulesStates,
  pageParam: any
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    sort: getMultiFieldsSort(sort),
    size: MAX_FINDINGS_TO_LOAD,
    aggs: getFindingsCountAggQueryMisconfigurationPreview(),
    ignore_unavailable: false,
    query: {
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
        must_not: [...(query?.bool?.must_not ?? []), ...mutedRulesFilterQuery],
      },
    },
    ...(pageParam ? { from: pageParam } : {}),
  };
};

const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction }),
    };
  });
};

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
const fieldsRequiredSortingByPainlessScript = [
  'rule.section',
  'resource.name',
  'resource.sub_type',
];

/**
 * Generates Painless sorting if the given field is matched or returns default sorting
 * This painless script will sort the field in case-insensitive manner
 */
const getSortField = ({ field, direction }: { field: string; direction: string }) => {
  if (fieldsRequiredSortingByPainlessScript.includes(field)) {
    return {
      _script: {
        type: 'string',
        order: direction,
        script: {
          source: `doc["${field}"].value.toLowerCase()`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: direction };
};

export const useMisconfigurationPreview = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  return useQuery(
    ['csp_findings', { params: options }, rulesStates],
    async ({ pageParam }) => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(options, rulesStates!, pageParam),
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be defined'); // Failed here

      return {
        count: getMisconfigurationAggregationCount(
          Object.entries(aggregations.count.buckets).map(([key, value]) => ({
            key,
            doc_count: value.doc_count || 0,
          }))
        ),
      };
    },
    {
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
