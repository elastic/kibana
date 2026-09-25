/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  RuleSummaryAboutSection,
  RuleSummaryBody,
  RuleSummaryInvestigationSection,
} from '../../rule/rule_summary';
import { useRule } from '../rule_context';

export const RuleSidebar: React.FC = () => {
  const rule = useRule();

  return (
    <RuleSummaryBody rule={rule}>
      <RuleSummaryAboutSection />
      <RuleSummaryInvestigationSection />
    </RuleSummaryBody>
  );
};
