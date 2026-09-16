/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useService } from '@kbn/core-di-browser';
import { UserCapabilities } from '../../../services/user_capabilities';
import { RuleSummaryAboutSection } from './rule_summary_about_section';
import { RuleSummaryInvestigationSection } from './rule_summary_investigation_section';
import { RuleSummaryActionPoliciesSection } from './rule_summary_action_policies_section';
import { RuleSummaryArtifactsSection } from './rule_summary_artifacts_section';
import type { RuleSummaryData } from '../types';

export interface RuleSummaryBodyProps {
  rule: RuleSummaryData;
}

export const RuleSummaryBody: React.FC<RuleSummaryBodyProps> = ({ rule }) => {
  const canReadActionPolicies = useService(UserCapabilities).canRead('actionPolicies');

  return (
    <div data-test-subj="ruleSummaryBody">
      <RuleSummaryAboutSection rule={rule} />
      <RuleSummaryInvestigationSection rule={rule} />
      {canReadActionPolicies && <RuleSummaryActionPoliciesSection rule={rule} />}
      <RuleSummaryArtifactsSection rule={rule} />
    </div>
  );
};
