/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleSummaryData } from '../types';
import { RuleSummaryActionPoliciesSection } from './rule_summary_action_policies_section';

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
  it('renders action policies for alert rules', () => {
    render(<RuleSummaryActionPoliciesSection rule={rule} />);

    expect(screen.getByTestId('ruleSummaryActionPolicies')).toBeInTheDocument();
    expect(screen.getByTestId('mockActionPoliciesArtifactsSubsection')).toBeInTheDocument();
  });

  it('does not render action policies for signal rules', () => {
    render(<RuleSummaryActionPoliciesSection rule={{ ...rule, kind: 'signal' }} />);

    expect(screen.queryByTestId('ruleSummaryActionPolicies')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockActionPoliciesArtifactsSubsection')).not.toBeInTheDocument();
  });
});
