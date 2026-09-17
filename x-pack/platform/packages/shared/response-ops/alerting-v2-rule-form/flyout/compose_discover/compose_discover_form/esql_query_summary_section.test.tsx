/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RuleQuery } from '../../../form/types';
import {
  EsqlQuerySummarySection,
  getEsqlSummaryState,
  type EsqlSummaryState,
} from './esql_query_summary_section';

const BASE = 'FROM logs-*';
const ALERT_SEGMENT = '| WHERE count > 100';

const ruleQuery = (base: string, segment: string): RuleQuery => ({
  base,
  breach: { segment },
});

describe('getEsqlSummaryState', () => {
  const cases: Array<{
    description: string;
    queryCommitted: boolean;
    query: RuleQuery;
    expected: EsqlSummaryState;
  }> = [
    {
      description: 'before_apply when query is not committed',
      queryCommitted: false,
      query: ruleQuery(BASE, ALERT_SEGMENT),
      expected: 'before_apply',
    },
    {
      description: 'success for base + breach segment',
      queryCommitted: true,
      query: ruleQuery(BASE, ALERT_SEGMENT),
      expected: 'success',
    },
    {
      description: 'no_alert_condition for a base without a breach segment',
      queryCommitted: true,
      query: ruleQuery(BASE, ''),
      expected: 'no_alert_condition',
    },
    {
      description: 'split_failed for a breach segment without a base',
      queryCommitted: true,
      query: ruleQuery('', ALERT_SEGMENT),
      expected: 'split_failed',
    },
    {
      description: 'empty for a query with neither base nor segment',
      queryCommitted: true,
      query: ruleQuery('', ''),
      expected: 'empty',
    },
  ];

  it.each(cases)('$description → $expected', ({ queryCommitted, query, expected }) => {
    expect(getEsqlSummaryState(queryCommitted, query)).toBe(expected);
  });

  /*
   * Callout priority is encoded by getEsqlSummaryState branch order:
   * empty → split_failed → no_alert_condition. These cases ensure the highest-priority
   * state wins when multiple partial conditions could apply.
   */
  it('prefers empty over split_failed when both base and segment are blank', () => {
    expect(getEsqlSummaryState(true, ruleQuery('', ''))).toBe('empty');
  });

  it('prefers split_failed over no_alert_condition when base is missing but segment exists', () => {
    expect(getEsqlSummaryState(true, ruleQuery('', ALERT_SEGMENT))).toBe('split_failed');
  });
});

describe('EsqlQuerySummarySection callouts', () => {
  const renderSection = (
    queryCommitted: boolean,
    query: RuleQuery,
    kind: 'alert' | 'signal' = 'alert'
  ) =>
    render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={query}
          queryCommitted={queryCommitted}
          kind={kind}
          isEditorOpen={false}
          onOpenEditor={jest.fn()}
        />
      </IntlProvider>
    );

  const calloutCases: Array<{
    state: EsqlSummaryState;
    query: RuleQuery;
    testSubj: string;
  }> = [
    {
      state: 'empty',
      query: ruleQuery('', ''),
      testSubj: 'esqlSummaryEmptyCallout',
    },
    {
      state: 'no_alert_condition',
      query: ruleQuery(BASE, ''),
      testSubj: 'esqlSummaryNoAlertConditionCallout',
    },
  ];

  it.each(calloutCases)('renders $testSubj when state is $state', ({ query, testSubj }) => {
    renderSection(true, query);
    expect(screen.getByTestId(testSubj)).toBeInTheDocument();
  });

  it('does not render a warning callout for success', () => {
    renderSection(true, ruleQuery(BASE, ALERT_SEGMENT));
    expect(screen.queryByTestId('esqlSummaryEmptyCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlSummaryNoAlertConditionCallout')).not.toBeInTheDocument();
  });

  it('hides alert-condition subtitle and callout for signal kind', () => {
    renderSection(true, ruleQuery(BASE, ''), 'signal');

    expect(screen.getByTestId('esqlQuerySummarySection-no_alert_condition')).toBeInTheDocument();
    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(
      screen.queryByText('Base query defined — no separate alert condition')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlSummaryNoAlertConditionCallout')).not.toBeInTheDocument();
  });
});
