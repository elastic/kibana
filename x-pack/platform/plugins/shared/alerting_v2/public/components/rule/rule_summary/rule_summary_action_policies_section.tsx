/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutAccordion } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ActionPoliciesArtifactsSubsection } from '../../rule_details/overview/artifacts/action_policies_artifacts_subsection';
import type { RuleSummarySectionProps } from '../types';

export const RuleSummaryActionPoliciesSection: React.FC<RuleSummarySectionProps> = ({ rule }) => {
  if (rule.kind === 'signal') {
    return null;
  }

  return (
    <FlyoutAccordion
      title={i18n.translate('xpack.alertingV2.ruleSummary.actionPolicies', {
        defaultMessage: 'Action Policies',
      })}
      hasBorder={false}
      initialIsOpen
      data-test-subj="ruleSummaryActionPolicies"
    >
      <ActionPoliciesArtifactsSubsection rule={rule} />
    </FlyoutAccordion>
  );
};
