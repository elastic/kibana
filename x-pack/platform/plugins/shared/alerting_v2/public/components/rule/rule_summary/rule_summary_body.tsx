/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleSummaryData } from '../types';
import { RuleSummaryContext } from './rule_summary_context';

export interface RuleSummaryBodyProps {
  rule: RuleSummaryData;
  children: React.ReactNode;
}

export const RuleSummaryBody: React.FC<RuleSummaryBodyProps> = ({ rule, children }) => (
  <RuleSummaryContext.Provider value={rule}>
    <div data-test-subj="ruleSummaryBody">{children}</div>
  </RuleSummaryContext.Provider>
);
