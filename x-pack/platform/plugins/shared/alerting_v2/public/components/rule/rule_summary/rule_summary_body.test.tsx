/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleSummaryBody } from './rule_summary_body';

jest.mock('../../../services/user_capabilities', () => ({
  UserCapabilities: 'UserCapabilities',
}));

jest.mock('@kbn/core-di-browser', () => {
  const canRead = jest.fn(() => true);
  return {
    useService: () => ({ canRead }),
    mockCanRead: canRead,
  };
});

const { mockCanRead } = jest.requireMock('@kbn/core-di-browser') as {
  mockCanRead: jest.Mock;
};

jest.mock('./rule_summary_about_section', () => ({
  RuleSummaryAboutSection: ({ rule }: { rule: RuleApiResponse }) => (
    <div data-test-subj="mockAboutSection">{rule.metadata.name}</div>
  ),
}));

jest.mock('./rule_summary_investigation_section', () => ({
  RuleSummaryInvestigationSection: ({ rule }: { rule: RuleApiResponse }) => (
    <div data-test-subj="mockInvestigationSection">{rule.metadata.name}</div>
  ),
}));

jest.mock('./rule_summary_action_policies_section', () => ({
  RuleSummaryActionPoliciesSection: () => <div data-test-subj="mockActionPoliciesSection" />,
}));

jest.mock('./rule_summary_artifacts_section', () => ({
  RuleSummaryArtifactsSection: ({ rule }: { rule: RuleApiResponse }) => (
    <div data-test-subj="mockArtifactsSection">{rule.metadata.name}</div>
  ),
}));

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { base: 'FROM logs-*' },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

describe('RuleSummaryBody', () => {
  beforeEach(() => {
    mockCanRead.mockReturnValue(true);
  });

  it('renders all summary sections without a flyout wrapper', () => {
    render(<RuleSummaryBody rule={rule} />);

    expect(screen.getByTestId('ruleSummaryBody')).toBeInTheDocument();
    expect(screen.getByTestId('mockAboutSection')).toHaveTextContent('Test rule');
    expect(screen.getByTestId('mockInvestigationSection')).toHaveTextContent('Test rule');
    expect(screen.getByTestId('mockActionPoliciesSection')).toBeInTheDocument();
    expect(screen.getByTestId('mockArtifactsSection')).toHaveTextContent('Test rule');
    expect(mockCanRead).toHaveBeenCalledWith('actionPolicies');
  });

  it('omits action policies when the user cannot read them', () => {
    mockCanRead.mockReturnValue(false);

    render(<RuleSummaryBody rule={rule} />);

    expect(screen.queryByTestId('mockActionPoliciesSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockArtifactsSection')).toBeInTheDocument();
  });
});
