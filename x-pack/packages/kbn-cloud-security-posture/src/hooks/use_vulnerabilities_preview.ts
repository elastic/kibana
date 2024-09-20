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
import { MAX_FINDINGS_TO_LOAD } from '@kbn/cloud-security-posture-common';
import type { CoreStart } from '@kbn/core/public';
import { EcsEvent } from '@elastic/ecs';
import type { CspClientPluginStartDeps, UseMisconfigurationOptions } from '../../type';
import { FindingsBaseEsQuery, showErrorToast } from '../..';
import {
  getFindingsCountAggQueryVulnerabilities,
  getVulnerabilitiesAggregationCount,
} from '../utils/hooks_utils';
// import { CspVulnerabilityFinding } from '../../../../common/schemas';
// import {
//   CDR_VULNERABILITIES_INDEX_PATTERN,
//   LATEST_VULNERABILITIES_RETENTION_POLICY,
// } from '../../../../common/constants';

//IMPORT THESE
export const CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN =
  'logs-cloud_security_posture.vulnerabilities_latest-default';
export const CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN =
  'security_solution-*.vulnerability_latest';
export const CDR_VULNERABILITIES_INDEX_PATTERN = `${CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN},${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`;
export const LATEST_VULNERABILITIES_RETENTION_POLICY = '3d';
export type VulnSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export interface CspVulnerabilityFinding {
  '@timestamp': string;
  resource?: {
    id: string;
    name: string;
  };
  event: EcsEvent;
  vulnerability: Vulnerability;
  ecs: {
    version: string;
  };
  host: {
    os: {
      name: string;
      kernel: string;
      codename: string;
      type: string;
      platform: string;
      version: string;
      family: string;
    };
    id: string;
    name: string;
    containerized: boolean;
    ip: string[];
    mac: string[];
    hostname: string;
    architecture: string;
  };
  agent: {
    ephemeral_id: string;
    id: string;
    name: string;
    type: string;
    version: string;
  };
  cloud: {
    image?: {
      id: string;
    };
    provider?: string;
    instance?: {
      id: string;
    };
    machine?: {
      type: string;
    };
    region: string;
    availability_zone?: string;
    service?: {
      name: string;
    };
    account?: {
      id: string;
    };
  };
  cloudbeat: {
    version: string;
    commit_sha: string;
    commit_time: string;
  };
  package: {
    version?: string;
    name?: string;
    fixed_version?: string;
  };
  data_stream: { dataset: string };
}

export interface Vulnerability {
  published_date?: string;
  score?: {
    version?: string;
    base?: number;
  };
  cwe: string[];
  id: string;
  title: string;
  reference: string;
  severity?: VulnSeverity;
  cvss?: {
    nvd: VectorScoreBase;
    redhat?: VectorScoreBase;
    ghsa?: VectorScoreBase;
  };
  data_source?: {
    ID: string;
    Name: string;
    URL: string;
  };
  enumeration: string;
  description: string;
  classification: string;
  scanner: {
    vendor: string;
  };
}

export interface VectorScoreBase {
  V3Score?: number;
  V3Vector?: string;
  V2Score?: number;
  V2Vector?: string;
}
//

type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  SearchResponse<CspVulnerabilityFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}
interface VulnerabilitiesQuery extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
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
        rawResponse: { aggregations, hits },
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
  //   return useInfiniteQuery(
  //     [CDR_VULNERABILITIES_INDEX_PATTERN, options],
  //     async ({ pageParam }) => {
  //       const {
  //         rawResponse: { hits },
  //       } = await lastValueFrom(
  //         data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
  //           params: getVulnerabilitiesQuery(options, pageParam),
  //         })
  //       );

  //       return {
  //         page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
  //         total: number.is(hits.total) ? hits.total : 0,
  //       };
  //     },
  //     {
  //       staleTime: 5000,
  //       keepPreviousData: true,
  //       enabled: options.enabled,
  //       onError: (err: Error) => showErrorToast(toasts, err),
  //       getNextPageParam: (lastPage, allPages) => {
  //         if (lastPage.page.length < options.pageSize) {
  //           return undefined;
  //         }
  //         return allPages.length * options.pageSize;
  //       },
  //     }
  //   );
};
