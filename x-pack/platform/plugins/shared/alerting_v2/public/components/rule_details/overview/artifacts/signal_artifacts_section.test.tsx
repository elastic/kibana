/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { SignalArtifactsSection } from './signal_artifacts_section';

jest.mock('./dashboard_artifacts_subsection', () => ({
  DashboardArtifactsSubsection: () => (
    <div data-test-subj="dashboardArtifactsSubsectionMock">dashboards</div>
  ),
}));

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Rule' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
  created_by: { profile_uid: 'alice@example.com' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'bob@example.com' },
  updated_at: '2026-03-04T12:00:00.000Z',
};

describe('SignalArtifactsSection', () => {
  it('renders the artifacts accordion with only the dashboard subsection', () => {
    render(
      <I18nProvider>
        <SignalArtifactsSection rule={rule} />
      </I18nProvider>
    );

    expect(screen.getByTestId('ruleArtifactsSection')).toBeInTheDocument();
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardArtifactsSubsectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPoliciesArtifactsSubsectionMock')).not.toBeInTheDocument();
  });
});
