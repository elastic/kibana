/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AggregationBuckets,
  getVulnerabilitiesAggregationCount,
  VULNERABILITIES_RESULT_EVALUATION,
} from './hooks_utils';

describe('getVulnerabilitiesAggregationCount', () => {
  it('should return default counts when nothing is provided', () => {
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
    };
    expect(getVulnerabilitiesAggregationCount()).toEqual(result);
  });

  it('should return default counts when empty bucket is provided', () => {
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
    };
    expect(getVulnerabilitiesAggregationCount({})).toEqual(result);
  });

  it('should return counts when provided with non empty buckets', () => {
    const buckets: AggregationBuckets = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: { doc_count: 1 },
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: { doc_count: 2 },
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: { doc_count: 3 },
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: { doc_count: 4 },
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: { doc_count: 5 },
    };

    const vulnerabilitiesAggregrationCount = getVulnerabilitiesAggregationCount(
      buckets as estypes.AggregationsBuckets<estypes.AggregationsStringRareTermsBucketKeys>
    );
    const result = {
      [VULNERABILITIES_RESULT_EVALUATION.LOW]: 1,
      [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 2,
      [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 3,
      [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 4,
      [VULNERABILITIES_RESULT_EVALUATION.NONE]: 5,
    };
    expect(vulnerabilitiesAggregrationCount).toEqual(result);
  });
});
