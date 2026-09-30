/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleSummaryData } from '../types';
import { RuleSummaryBody } from './rule_summary_body';
import { RuleSummaryActionPoliciesSection } from './rule_summary_action_policies_section';

const mockCanRead = jest.fn(() => true);

jest.mock('../../../services/user_capabilities', () => ({
  UserCapabilities: 'UserCapabilities',
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ canRead: mockCanRead }),
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
        <RuleSummaryActionPoliciesSection />
      </RuleSummaryBody>
    </I18nProvider>
  );

describe('RuleSummaryActionPoliciesSection', () => {
  beforeEach(() => {
    mockCanRead.mockReturnValue(true);
  });

  it('renders action policies for alert rules inside the summary flyout', () => {
    renderSection();

    expect(screen.getByTestId('ruleSummaryActionPolicies')).toHaveTextContent('Action policies');
    expect(
      screen
        .getByTestId('ruleSummaryActionPolicies')
        .querySelector('[data-euiicon-type="tablePlay"]')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toHaveAttribute(
      'data-session',
      'inherit'
    );
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toHaveAttribute(
      'data-show-title',
      'false'
    );
  });

  it('does not render action policies for signal rules', () => {
    renderSection({ ...rule, kind: 'signal' });

    expect(screen.queryByTestId('ruleSummaryActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });

  it('does not render action policies without read access', () => {
    mockCanRead.mockReturnValue(false);

    renderSection();

    expect(screen.queryByTestId('ruleSummaryActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });
});
