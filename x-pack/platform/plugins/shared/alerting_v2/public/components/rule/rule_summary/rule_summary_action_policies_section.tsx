/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutAccordion } from '@kbn/flyout-sections';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { UserCapabilities } from '../../../services/user_capabilities';
import { ActionPoliciesArtifactsSubsection } from '../../rule_details/overview/artifacts/action_policies_artifacts_subsection';
import { useRuleSummary } from './rule_summary_context';

export const RuleSummaryActionPoliciesSection: React.FC = () => {
  const rule = useRuleSummary();
  const canReadActionPolicies = useService(UserCapabilities).canRead('actionPolicies');

  if (rule.kind === 'signal' || !canReadActionPolicies) {
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
