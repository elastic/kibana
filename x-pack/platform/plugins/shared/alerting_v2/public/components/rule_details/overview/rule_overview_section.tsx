/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiErrorBoundary, EuiSpacer } from '@elastic/eui';
import { useService } from '@kbn/core-di-browser';
import { UserCapabilities } from '../../../services/user_capabilities';
import { AlertTimelineSection } from './alert_timeline/alert_timeline_section';
import { ArtifactsSection, SignalArtifactsSection } from './artifacts';
import { SignalRuleOverview } from './signal_rule_overview';
import { useRule } from '../rule_context';

export const RuleOverviewSection: React.FC = () => {
  const rule = useRule();
  const canReadAlerts = useService(UserCapabilities).canRead('alerts');

  return (
    <div data-test-subj="ruleOverviewSection">
      {rule.kind === 'signal' ? (
        <EuiErrorBoundary>
          <SignalRuleOverview />
        </EuiErrorBoundary>
      ) : canReadAlerts ? (
        <EuiErrorBoundary>
          <AlertTimelineSection />
        </EuiErrorBoundary>
      ) : null}
      {rule.kind === 'alert' ? (
        <>
          <EuiSpacer size="l" />
          <ArtifactsSection />
        </>
      ) : null}
      {rule.kind === 'signal' ? (
        <>
          <EuiSpacer size="l" />
          <SignalArtifactsSection />
        </>
      ) : null}
    </div>
  );
};
