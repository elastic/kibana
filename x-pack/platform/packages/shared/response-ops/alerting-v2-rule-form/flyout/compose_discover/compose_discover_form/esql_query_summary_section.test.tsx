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

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-test-subj="codeEditorMock" />,
  ESQL_LANG_ID: 'esql',
}));

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
      description: 'no_alert_condition for standalone with breach query (every row is a breach)',
      queryCommitted: true,
      query: standaloneQuery(BASE),
      expected: 'no_alert_condition',
    },
    {
      description: 'empty for standalone with empty breach query',
      queryCommitted: true,
      query: standaloneQuery(''),
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
    expect(getEsqlSummaryState(true, composedQuery('', ''))).toBe('empty');
  });

  it('prefers split_failed over no_alert_condition when base is missing but segment exists', () => {
    expect(getEsqlSummaryState(true, composedQuery('', ALERT_SEGMENT))).toBe('split_failed');
  });
});

describe('EsqlQuerySummarySection callouts', () => {
  const renderSection = (queryCommitted: boolean, query: RuleQuery) =>
    render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={query}
          queryCommitted={queryCommitted}
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
      state: 'split_failed',
      query: composedQuery('', ALERT_SEGMENT),
      testSubj: 'esqlSummarySplitFailedCallout',
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
    expect(screen.queryByTestId('esqlSummarySplitFailedCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlSummaryNoAlertConditionCallout')).not.toBeInTheDocument();
  });
});

// ── split-failed CTA (onManualSplit) ──────────────────────────────────────────

describe('EsqlQuerySummarySection — split-failed CTA', () => {
  const splitFailedQuery = composedQuery('', ALERT_SEGMENT);

  it('renders Separate base and alert CTA when onManualSplit is provided in split_failed state', () => {
    const onManualSplit = jest.fn();
    render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={splitFailedQuery}
          queryCommitted
          isEditorOpen={false}
          onOpenEditor={jest.fn()}
          onManualSplit={onManualSplit}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('esqlSummarySeparateManually')).toBeInTheDocument();
  });

  it('fires onManualSplit when the CTA is clicked', async () => {
    const onManualSplit = jest.fn();
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={splitFailedQuery}
          queryCommitted
          isEditorOpen={false}
          onOpenEditor={jest.fn()}
          onManualSplit={onManualSplit}
        />
      </IntlProvider>
    );
    getByTestId('esqlSummarySeparateManually').click();
    expect(onManualSplit).toHaveBeenCalledTimes(1);
  });

  it('does not render the CTA when onManualSplit is absent', () => {
    render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={splitFailedQuery}
          queryCommitted
          isEditorOpen={false}
          onOpenEditor={jest.fn()}
        />
      </IntlProvider>
    );
    expect(screen.queryByTestId('esqlSummarySeparateManually')).not.toBeInTheDocument();
  });

  it('does not render the CTA for non-split_failed states even when onManualSplit is provided', () => {
    const onManualSplit = jest.fn();
    render(
      <IntlProvider locale="en">
        <EsqlQuerySummarySection
          query={composedQuery(BASE, ALERT_SEGMENT)}
          queryCommitted
          isEditorOpen={false}
          onOpenEditor={jest.fn()}
          onManualSplit={onManualSplit}
        />
      </IntlProvider>
    );
    expect(screen.queryByTestId('esqlSummarySeparateManually')).not.toBeInTheDocument();
  });
});
