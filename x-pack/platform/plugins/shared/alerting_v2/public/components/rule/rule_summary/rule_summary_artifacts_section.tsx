/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutAccordion } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DashboardArtifactsSubsection } from '../../rule_details/overview/artifacts/dashboard_artifacts_subsection';
import { useRuleSummary } from './rule_summary_context';

export const RuleSummaryArtifactsSection: React.FC = () => {
  const rule = useRuleSummary();
  const hasDashboards = Boolean(rule.artifacts?.some((artifact) => artifact.type === 'dashboard'));

  return (
    <FlyoutAccordion
      title={i18n.translate('xpack.alertingV2.ruleSummary.artifacts', {
        defaultMessage: 'Artifacts',
      })}
      hasBorder={false}
      initialIsOpen={hasDashboards}
      data-test-subj="ruleSummaryArtifacts"
    >
      <DashboardArtifactsSubsection rule={rule} />
    </FlyoutAccordion>
  );
};
