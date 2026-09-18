/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
  ActionPoliciesArtifactsSubsection: () => (
    <div data-test-subj="mockActionPoliciesArtifactsSubsection" />
  ),
}));

const rule: RuleSummaryData = {
  id: 'rule-1',
  kind: 'alert',
  metadata: { name: 'Test rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
};

describe('RuleSummaryActionPoliciesSection', () => {
  beforeEach(() => {
    mockCanRead.mockReturnValue(true);
  });

  it('renders action policies for alert rules', () => {
    render(
      <RuleSummaryBody rule={rule}>
        <RuleSummaryActionPoliciesSection />
      </RuleSummaryBody>
    );

    expect(screen.getByTestId('ruleSummaryActionPolicies')).toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toBeInTheDocument();
  });

  it('does not render action policies for signal rules', () => {
    render(
      <RuleSummaryBody rule={{ ...rule, kind: 'signal' }}>
        <RuleSummaryActionPoliciesSection />
      </RuleSummaryBody>
    );

    expect(screen.queryByTestId('ruleSummaryActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });

  it('does not render action policies without read access', () => {
    mockCanRead.mockReturnValue(false);

    render(
      <RuleSummaryBody rule={rule}>
        <RuleSummaryActionPoliciesSection />
      </RuleSummaryBody>
    );

    expect(screen.queryByTestId('ruleSummaryActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });
});
