/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RuleKind, RuleQuery } from '../../../form/types';
import {
  EsqlQuerySummarySection,
  getEsqlSummaryState,
  type EsqlSummaryState,
} from './esql_query_summary_section';

const BASE = 'FROM logs-*';
const ALERT_SEGMENT = '| WHERE count > 100';

const composedQuery = (
  base: string,
  segment: string,
  recovery?: { segment: string }
): RuleQuery => ({
  format: 'composed',
  base,
  breach: { segment },
  ...(recovery ? { recovery } : {}),
});

const standaloneQuery = (query: string, recovery?: { query: string }): RuleQuery => ({
  format: 'standalone',
  breach: { query },
  ...(recovery ? { recovery } : {}),
});

describe('getEsqlSummaryState', () => {
  const cases: Array<{
    description: string;
    queryCommitted: boolean;
    query: RuleQuery;
    forceUnified?: boolean;
    expected: EsqlSummaryState;
  }> = [
    {
      description: 'before_apply when query is not committed',
      queryCommitted: false,
      query: composedQuery(BASE, ALERT_SEGMENT),
      expected: 'before_apply',
    },
    {
      description: 'success for composed base + breach segment',
      queryCommitted: true,
      query: composedQuery(BASE, ALERT_SEGMENT),
      expected: 'success',
    },
    {
      description: 'no_alert_condition for composed base without breach segment',
      queryCommitted: true,
      query: composedQuery(BASE, ''),
      expected: 'no_alert_condition',
    },
    {
      description: 'split_failed for composed breach segment without base',
      queryCommitted: true,
      query: composedQuery('', ALERT_SEGMENT),
      expected: 'split_failed',
    },
    {
      description: 'empty for composed query with neither base nor segment',
      queryCommitted: true,
      query: composedQuery('', ''),
      expected: 'empty',
    },
    {
      description: 'no_alert_condition for standalone without an alert condition',
      queryCommitted: true,
      query: standaloneQuery(BASE),
      expected: 'no_alert_condition',
    },
    {
      description: 'success for standalone with a WHERE alert condition (no STATS)',
      queryCommitted: true,
      query: standaloneQuery('FROM logs-* | WHERE c > 3'),
      expected: 'success',
    },
    {
      description: 'empty for standalone with empty breach query',
      queryCommitted: true,
      query: standaloneQuery(''),
      expected: 'empty',
    },
    {
      description: 'success for composed query when forceUnified (signal) and text has WHERE',
      queryCommitted: true,
      query: composedQuery(BASE, ALERT_SEGMENT),
      forceUnified: true,
      expected: 'success',
    },
  ];

  it.each(cases)(
    '$description → $expected',
    ({ queryCommitted, query, forceUnified, expected }) => {
      expect(getEsqlSummaryState(queryCommitted, query, { forceUnified })).toBe(expected);
    }
  );

  /*
   * Callout priority is encoded by getEsqlSummaryState branch order:
   * empty → split_failed → no_alert_condition. These cases ensure the highest-priority
   * state wins when multiple partial conditions could apply.
   */
  it('prefers empty over split_failed when both base and segment are blank', () => {
    expect(getEsqlSummaryState(true, composedQuery('', ''))).toBe('empty');
  });

  it('prefers split_failed over no_alert_condition when base is missing but segment exists', () => {
    expect(getEsqlSummaryState(true, composedQuery('', ALERT_SEGMENT))).toBe('split_failed');
  });
});

describe('EsqlQuerySummarySection callouts', () => {
  const renderSection = (queryCommitted: boolean, query: RuleQuery, kind: RuleKind = 'alert') =>
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
      query: composedQuery('', ''),
      testSubj: 'esqlSummaryEmptyCallout',
    },
    {
      state: 'no_alert_condition',
      query: composedQuery(BASE, ''),
      testSubj: 'esqlSummaryNoAlertConditionCallout',
    },
  ];

  it.each(calloutCases)('renders $testSubj when state is $state', ({ query, testSubj }) => {
    renderSection(true, query);
    expect(screen.getByTestId(testSubj)).toBeInTheDocument();
  });

  it('does not render a warning callout for success', () => {
    renderSection(true, composedQuery(BASE, ALERT_SEGMENT));
    expect(screen.queryByTestId('esqlSummaryEmptyCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlSummaryNoAlertConditionCallout')).not.toBeInTheDocument();
  });

  it('renders the no-alert-condition callout copy', () => {
    renderSection(true, composedQuery(BASE, ''));
    expect(screen.getByText('No alert condition')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Without an alert condition, every row returned by the base query is treated as a breach.'
      )
    ).toBeInTheDocument();
  });

  it('always shows a single query block for signal kind, never a guessed split', () => {
    renderSection(true, composedQuery(BASE, ALERT_SEGMENT), 'signal');
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.queryByText('Base query')).not.toBeInTheDocument();
    expect(screen.queryByText('Alert condition')).not.toBeInTheDocument();
  });
});
