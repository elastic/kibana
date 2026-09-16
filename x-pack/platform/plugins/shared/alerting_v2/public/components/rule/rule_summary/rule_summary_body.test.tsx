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

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

describe('RuleSummaryBody', () => {
  it('renders its shared sections and optional host-provided sections without a flyout wrapper', () => {
    render(
      <RuleSummaryBody rule={rule}>
        <div data-test-subj="hostSection" />
      </RuleSummaryBody>
    );

    expect(screen.getByTestId('ruleSummaryBody')).toBeInTheDocument();
    expect(screen.getByTestId('mockAboutSection')).toHaveTextContent('Test rule');
    expect(screen.getByTestId('mockInvestigationSection')).toHaveTextContent('Test rule');
    expect(screen.getByTestId('hostSection')).toBeInTheDocument();
  });
});
