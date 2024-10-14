/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_VULNERABILITIES_INDEX_PATTERN,
  CDR_3RD_PARTY_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { buildMutedRulesFilter } from '@kbn/cloud-security-posture-common';
import type { UseCspOptions } from '../types';

const MISCONFIGURATIONS_SOURCE_FIELDS = ['result.*', 'rule.*', 'resource.*'];
interface AggregationBucket {
  doc_count?: number;
}

export type AggregationBuckets = Record<string, AggregationBucket>;

const RESULT_EVALUATION = {
  PASSED: 'passed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

export const VULNERABILITIES_RESULT_EVALUATION = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  NONE: 'NONE',
};

export const getFindingsCountAggQueryMisconfiguration = () => ({
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
  buckets?: estypes.AggregationsBuckets<estypes.AggregationsStringRareTermsBucketKeys>
) => {
  const defaultBuckets: AggregationBuckets = {
    [RESULT_EVALUATION.PASSED]: { doc_count: 0 },
    [RESULT_EVALUATION.FAILED]: { doc_count: 0 },
    [RESULT_EVALUATION.UNKNOWN]: { doc_count: 0 },
  };

  // if buckets are undefined we will use default buckets
  const usedBuckets = buckets || defaultBuckets;
  return Object.entries(usedBuckets).reduce(
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
  { query }: UseCspOptions,
  rulesStates: CspBenchmarkRulesStates,
  isPreview = false
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    size: isPreview ? 0 : 500,
    aggs: getFindingsCountAggQueryMisconfiguration(),
    ignore_unavailable: true,
    query: buildMisconfigurationsFindingsQueryWithFilters(query, mutedRulesFilterQuery),
    _source: MISCONFIGURATIONS_SOURCE_FIELDS,
  };
};

const buildMisconfigurationsFindingsQueryWithFilters = (
  query: UseCspOptions['query'],
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
              gte: `now-${CDR_3RD_PARTY_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
      must_not: [...mutedRulesFilterQuery],
    },
  };
};

export const getVulnerabilitiesAggregationCount = (
  buckets?: estypes.AggregationsBuckets<estypes.AggregationsStringRareTermsBucketKeys>
) => {
  const defaultBuckets: AggregationBuckets = {
    [VULNERABILITIES_RESULT_EVALUATION.LOW]: { doc_count: 0 },
    [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: { doc_count: 0 },
    [VULNERABILITIES_RESULT_EVALUATION.HIGH]: { doc_count: 0 },
    [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: { doc_count: 0 },
    [VULNERABILITIES_RESULT_EVALUATION.NONE]: { doc_count: 0 },
  };

  // if buckets are undefined we will use default buckets
  const usedBuckets = buckets || defaultBuckets;
  return Object.entries(usedBuckets).reduce(
    (evaluation, [key, value]) => {
      evaluation[key] = (evaluation[key] || 0) + (value.doc_count || 0);
      return evaluation;
    },
    {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
    }
  );
};

export const getFindingsCountAggQueryVulnerabilities = () => ({
  count: {
    filters: {
      other_bucket_key: VULNERABILITIES_RESULT_EVALUATION.NONE,
      filters: {
        [VULNERABILITIES_RESULT_EVALUATION.LOW]: {
          match: { 'vulnerability.severity': VULNERABILITIES_RESULT_EVALUATION.LOW },
        },
        [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: {
          match: { 'vulnerability.severity': VULNERABILITIES_RESULT_EVALUATION.MEDIUM },
        },
        [VULNERABILITIES_RESULT_EVALUATION.HIGH]: {
          match: { 'vulnerability.severity': VULNERABILITIES_RESULT_EVALUATION.HIGH },
        },
        [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: {
          match: { 'vulnerability.severity': VULNERABILITIES_RESULT_EVALUATION.CRITICAL },
        },
      },
    },
  },
});

export const getVulnerabilitiesQuery = ({ query }: UseCspOptions, isPreview = false) => ({
  index: CDR_VULNERABILITIES_INDEX_PATTERN,
  size: isPreview ? 0 : 500,
  aggs: getFindingsCountAggQueryVulnerabilities(),
  ignore_unavailable: true,
  query: buildVulnerabilityFindingsQueryWithFilters(query),
});

const buildVulnerabilityFindingsQueryWithFilters = (query: UseCspOptions['query']) => {
  return {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter ?? []),
        {
          range: {
            '@timestamp': {
              gte: `now-${CDR_3RD_PARTY_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  };
};
