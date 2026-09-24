/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService, CoreStart } from '@kbn/core-di-browser';
import { useMatchedActionPolicies } from '@kbn/alerting-v2-rule-form';

export interface UseLinkedActionPoliciesResult {
  totalCount: number;
  catchAllCount: number;
  matchingCriteriaCount: number;
  evaluatedCount: number;
  /** True when some policies in the space were not evaluated and counts may be incomplete. */
  isCountTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useLinkedActionPolicies = (tags: string[]): UseLinkedActionPoliciesResult => {
  const http = useService(CoreStart('http'));
  const { isLoading, error, items, evaluatedCount, isTruncated } = useMatchedActionPolicies({
    http,
    tags,
  });

  return {
    totalCount: items.length,
    catchAllCount: items.filter((item) => item.category === 'catch_all').length,
    matchingCriteriaCount: items.filter((item) => item.category === 'tags').length,
    evaluatedCount,
    isCountTruncated: isTruncated,
    isLoading,
    isError: error != null,
    error,
  };
};
