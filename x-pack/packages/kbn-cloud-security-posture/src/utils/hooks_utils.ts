/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { buildMutedRulesFilter } from '@kbn/cloud-security-posture-common';

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
  rulesStates: CspBenchmarkRulesStates,
  isPreview = false
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    size: isPreview ? 0 : 500,
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
