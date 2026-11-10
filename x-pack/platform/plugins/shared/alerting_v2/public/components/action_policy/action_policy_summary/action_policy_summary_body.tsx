/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionPolicySummaryContext,
  type ActionPolicySummaryData,
} from './action_policy_summary_context';

export interface ActionPolicySummaryBodyProps {
  policy: ActionPolicySummaryData;
  children: React.ReactNode;
}

export const ActionPolicySummaryBody = ({ policy, children }: ActionPolicySummaryBodyProps) => (
  <ActionPolicySummaryContext.Provider value={policy}>
    <div data-test-subj="actionPolicySummaryBody">{children}</div>
  </ActionPolicySummaryContext.Provider>
);
