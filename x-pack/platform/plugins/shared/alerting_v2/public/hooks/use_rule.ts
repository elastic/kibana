/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import type { RuleApiResponse } from '../services/rules_api';
import { useFetchRule } from './use_fetch_rule';

/**
 * Returns the current rule from React Query cache.
 * Must be used within a route that has already loaded the rule (e.g. RuleDetailsRoute),
 * which gates on loading/error states before rendering children.
 */
export const useRule = (): RuleApiResponse => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const { data } = useFetchRule(ruleId);
  if (!data) {
    throw new Error('useRule must be used within a route that has loaded the rule');
  }
  return data;
};
