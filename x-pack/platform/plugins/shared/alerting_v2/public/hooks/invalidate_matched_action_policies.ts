/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import { matchedActionPoliciesQueryKey } from '@kbn/alerting-v2-rule-form';

/** Drops cached rule-to-policy matches so open rule details refetch after a policy change. */
export const invalidateMatchedActionPolicies = (queryClient: QueryClient): void => {
  queryClient.invalidateQueries({ queryKey: matchedActionPoliciesQueryKey, exact: false });
};
