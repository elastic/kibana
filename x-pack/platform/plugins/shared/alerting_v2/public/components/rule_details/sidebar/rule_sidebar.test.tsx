/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleSidebar } from './rule_sidebar';

let capturedSummaryRule: Record<string, unknown> = {};

jest.mock('../../rule/rule_summary', () => ({
  RuleSummaryBody: ({
    rule,
    children,
  }: {
    rule: Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    capturedSummaryRule = rule;
    return <div data-test-subj="mockRuleSummaryBody">{children}</div>;
  },
  RuleSummaryAboutSection: () => <div data-test-subj="mockAboutSection" />,
  RuleSummaryInvestigationSection: () => <div data-test-subj="mockInvestigationSection" />,
}));

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

describe('RuleSidebar', () => {
  beforeEach(() => {
    capturedSummaryRule = {};
  });

  it('renders the details-page summary composition with the loaded rule', () => {
    render(
      <RuleProvider rule={rule}>
        <RuleSidebar />
      </RuleProvider>
    );

    expect(screen.getByTestId('mockRuleSummaryBody')).toBeInTheDocument();
    expect(screen.getByTestId('mockAboutSection')).toBeInTheDocument();
    expect(screen.getByTestId('mockInvestigationSection')).toBeInTheDocument();
    expect(capturedSummaryRule).toBe(rule);
  });
});
