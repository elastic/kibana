/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleSummaryData } from '../types';
import { RuleSummaryBody } from './rule_summary_body';
import { RuleSummaryArtifactsSection } from './rule_summary_artifacts_section';

const mockCanRead = jest.fn(() => true);

jest.mock('../../../services/user_capabilities', () => ({
  UserCapabilities: 'UserCapabilities',
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ canRead: mockCanRead }),
}));

jest.mock('../../rule_details/overview/artifacts/dashboard_artifacts_subsection', () => ({
  DashboardArtifactsSubsection: () => <div data-test-subj="mockDashboardArtifactsSubsection" />,
}));

jest.mock('../../rule_details/overview/artifacts/action_policies_artifacts_subsection', () => ({
  ActionPoliciesArtifactsSubsection: ({
    flyoutSession,
    showTitle,
  }: {
    flyoutSession?: string;
    showTitle?: boolean;
  }) => (
    <div
      data-test-subj="mockActionPoliciesArtifactsSubsection"
      data-session={flyoutSession}
      data-show-title={String(showTitle)}
    />
  ),
}));

const rule: RuleSummaryData = {
  id: 'rule-1',
  kind: 'alert',
  metadata: { name: 'Test rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { base: 'FROM logs-*' },
};

const renderSection = (summaryRule: RuleSummaryData = rule) =>
  render(
    <I18nProvider>
      <RuleSummaryBody rule={summaryRule}>
        <RuleSummaryArtifactsSection />
      </RuleSummaryBody>
    </I18nProvider>
  );

describe('RuleSummaryArtifactsSection', () => {
  beforeEach(() => {
    mockCanRead.mockReturnValue(true);
  });

  it('renders dashboards and action policies under the Artifacts accordion', () => {
    renderSection();

    expect(screen.getByTestId('ruleSummaryArtifacts')).toHaveTextContent('Artifacts');
    expect(screen.getByTestId('ruleSummaryArtifactsSubsections')).toBeInTheDocument();
    expect(screen.getByTestId('mockDashboardArtifactsSubsection')).toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toHaveAttribute(
      'data-session',
      'inherit'
    );
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toHaveAttribute(
      'data-show-title',
      'true'
    );
    expect(mockCanRead).toHaveBeenCalledWith('actionPolicies');
    expect(within(screen.getByTestId('ruleSummaryArtifacts')).getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('opens Artifacts when the rule has a dashboard', async () => {
    renderSection({
      ...rule,
      artifacts: [{ id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } }],
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId('ruleSummaryArtifacts')).getByRole('button')
      ).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('does not render action policies for signal rules', () => {
    renderSection({ ...rule, kind: 'signal' });

    expect(screen.getByTestId('mockDashboardArtifactsSubsection')).toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });

  it('does not render action policies without read access', () => {
    mockCanRead.mockReturnValue(false);

    renderSection();

    expect(screen.getByTestId('mockDashboardArtifactsSubsection')).toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });
});
