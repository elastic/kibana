/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryBlock, QuerySummary, getQuerySummaryOverflowHeight } from './query_summary';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('getQuerySummaryOverflowHeight', () => {
  it('returns undefined for empty queries', () => {
    expect(getQuerySummaryOverflowHeight('')).toBeUndefined();
    expect(getQuerySummaryOverflowHeight('   ')).toBeUndefined();
  });

  it('returns undefined for queries up to MAX_VISIBLE_LINES', () => {
    const fiveLineQuery = Array.from({ length: 5 }, (_, index) => `line ${index + 1}`).join('\n');

    expect(getQuerySummaryOverflowHeight('FROM logs-*')).toBeUndefined();
    expect(getQuerySummaryOverflowHeight('FROM logs-*\n| STATS count = COUNT(*)')).toBeUndefined();
    expect(getQuerySummaryOverflowHeight(fiveLineQuery)).toBeUndefined();
  });

  it('returns overflow height when query exceeds MAX_VISIBLE_LINES', () => {
    const sixLineQuery = Array.from({ length: 6 }, (_, index) => `line ${index + 1}`).join('\n');

    expect(getQuerySummaryOverflowHeight(sixLineQuery)).toBe(240);
  });
});

describe('QuerySummary', () => {
  it('renders empty state when query is blank', () => {
    renderWithIntl(<QuerySummary query="" emptyMessage="Not defined" />);

    expect(screen.getByText('Not defined')).toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverQuerySummary')).not.toBeInTheDocument();
  });

  it('renders esql code block when query has content', () => {
    renderWithIntl(<QuerySummary query="FROM logs-*" />);

    const codeBlock = screen.getByTestId('composeDiscoverQuerySummary');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock).toHaveAttribute('data-code-language', 'esql');
    expect(screen.getByText('FROM logs-*')).toBeInTheDocument();
  });
});

describe('QueryBlock', () => {
  it('renders label and query summary', () => {
    renderWithIntl(<QueryBlock label="Base query" query="FROM logs-*" />);

    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverQuerySummary')).toBeInTheDocument();
    expect(screen.getByText('FROM logs-*')).toBeInTheDocument();
  });

  it('renders empty state with custom message', () => {
    renderWithIntl(<QueryBlock label="Alert condition" query="" emptyMessage="Not defined" />);

    expect(screen.getByText('Alert condition')).toBeInTheDocument();
    expect(screen.getByText('Not defined')).toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverQuerySummary')).not.toBeInTheDocument();
  });
});
