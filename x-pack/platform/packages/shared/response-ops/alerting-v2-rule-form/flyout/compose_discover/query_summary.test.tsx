/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryBlock, QuerySummary } from './query_summary';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

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
