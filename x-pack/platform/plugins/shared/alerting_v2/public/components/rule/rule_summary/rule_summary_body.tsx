/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleSummaryAboutSection } from './rule_summary_about_section';
import { RuleSummaryInvestigationSection } from './rule_summary_investigation_section';
import type { RuleSummaryData } from './types';

export interface RuleSummaryBodyProps {
  rule: RuleSummaryData;
  children?: React.ReactNode;
}

export const RuleSummaryBody: React.FC<RuleSummaryBodyProps> = ({ rule, children }) => (
  <div data-test-subj="ruleSummaryBody">
    <RuleSummaryAboutSection rule={rule} />
    <RuleSummaryInvestigationSection rule={rule} />
    {children}
  </div>
);
