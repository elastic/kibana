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
import { useRuleSummary } from './rule_summary_context';

const rule: RuleSummaryData = {
  id: 'rule-1',
  kind: 'alert',
  metadata: { name: 'Test rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
};

const SummaryConsumer = () => {
  const summaryRule = useRuleSummary();
  return <div data-test-subj="summaryRuleName">{summaryRule.metadata.name}</div>;
};

describe('RuleSummaryBody', () => {
  it('renders its children with access to the summary rule', () => {
    render(
      <RuleSummaryBody rule={rule}>
        <SummaryConsumer />
        <div data-test-subj="secondChild" />
      </RuleSummaryBody>
    );

    expect(screen.getByTestId('ruleSummaryBody')).toBeInTheDocument();
    expect(screen.getByTestId('summaryRuleName')).toHaveTextContent('Test rule');
    expect(screen.getByTestId('secondChild')).toBeInTheDocument();
  });

  it('requires consumers to be rendered inside the body', () => {
    expect(() => render(<SummaryConsumer />)).toThrow(
      'useRuleSummary must be used within RuleSummaryBody'
    );
  });
});
