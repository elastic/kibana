/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';

/** The policy fields rendered by the shared action policy summary sections. */
export type ActionPolicySummaryData = Pick<
  ActionPolicyResponse,
  'description' | 'matcher' | 'grouping' | 'throttle' | 'destinations'
>;

export const ActionPolicySummaryContext = createContext<ActionPolicySummaryData | undefined>(
  undefined
);

export const useActionPolicySummary = (): ActionPolicySummaryData => {
  const policy = useContext(ActionPolicySummaryContext);

  if (!policy) {
    throw new Error('useActionPolicySummary must be used within ActionPolicySummaryBody');
  }

  return policy;
};
