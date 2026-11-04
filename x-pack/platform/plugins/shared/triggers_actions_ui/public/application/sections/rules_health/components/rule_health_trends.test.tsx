/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ExecutionTrends } from '../../../lib/rule_api/load_global_execution_trends';
import { RuleHealthTrends } from './rule_health_trends';

jest.mock('../../../../common/lib/kibana');

const trends: ExecutionTrends = {
  interval: '1h',
  buckets: [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      total: 3,
      success: 2,
      failure: 1,
      warning: 0,
      unknown: 0,
      avgDurationMs: 120,
    },
  ],
  topFailingRules: [
    { id: 'rule-1', name: 'Failing rule', failures: 4, lastFailure: '2024-01-01T00:00:00.000Z' },
  ],
  slowestRules: [{ id: 'rule-2', name: 'Slow rule', executions: 10, avgDurationMs: 2500 }],
};

const renderTrends = (props: Partial<React.ComponentProps<typeof RuleHealthTrends>> = {}) => {
  const history = createMemoryHistory();
  render(
    <IntlProvider locale="en">
      <Router history={history}>
        <RuleHealthTrends trends={trends} isLoading={false} {...props} />
      </Router>
    </IntlProvider>
  );
  return history;
};

describe('RuleHealthTrends', () => {
  it('renders the failing and slowest rule tables', () => {
    renderTrends();

    const failing = within(screen.getByTestId('ruleHealthTrendsFailingRules'));
    expect(failing.getByText('Failing rule')).toBeInTheDocument();
    expect(failing.getByText('4')).toBeInTheDocument();

    const slowest = within(screen.getByTestId('ruleHealthTrendsSlowestRules'));
    expect(slowest.getByText('Slow rule')).toBeInTheDocument();
    expect(slowest.getByText('00:00:02.500')).toBeInTheDocument();
  });

  it('links rules to their details page', () => {
    renderTrends();

    const [link] = screen.getAllByTestId('ruleHealthTrendsRuleLink');
    expect(link).toHaveAttribute('href', '/rule/rule-1');
  });

  it('renders empty states when there are no executions', () => {
    renderTrends({
      trends: { interval: '1h', buckets: [], topFailingRules: [], slowestRules: [] },
    });

    expect(screen.getByTestId('ruleHealthTrendsOutcomes')).toHaveTextContent(
      'No rule executions were recorded in this time range.'
    );
    expect(screen.getByTestId('ruleHealthTrendsFailingRules')).toHaveTextContent(
      'No rule failed in this time range.'
    );
  });
});
