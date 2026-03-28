/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryResultsGrid, type QueryResultsGridProps } from './query_results_grid';
import type { PreviewColumn } from '../hooks/use_preview';

jest.mock('./rule_preview_chart', () => ({
  PreviewChart: () => <div data-test-subj="previewChart">Chart Mock</div>,
}));

const defaultColumns: PreviewColumn[] = [
  { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
  { id: 'message', displayAsText: 'message', esType: 'keyword' },
];

const defaultRows = [
  { '@timestamp': '2024-01-01T00:00:00Z', message: 'Error occurred' },
  { '@timestamp': '2024-01-01T00:01:00Z', message: 'Warning issued' },
];

const defaultProps: QueryResultsGridProps = {
  title: 'Test preview',
  dataTestSubj: 'testPreviewGrid',
  emptyBody: 'Configure something to see results.',
  noResultsBody: 'The query returned no results.',
  columns: defaultColumns,
  rows: defaultRows,
  totalRowCount: 2,
  isLoading: false,
  isError: false,
  error: null,
};

const renderGrid = (overrides: Partial<QueryResultsGridProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <QueryResultsGrid {...defaultProps} {...overrides} />
    </IntlProvider>
  );

describe('QueryResultsGrid', () => {
  it('renders the title', () => {
    renderGrid();
    expect(screen.getByText('Test preview')).toBeInTheDocument();
  });

  it('renders the data grid with the provided data-test-subj', () => {
    renderGrid();
    expect(screen.getByTestId('testPreviewGrid')).toBeInTheDocument();
  });

  it('renders row count note for multiple rows', () => {
    renderGrid();
    expect(screen.getByText('Query returned 2 rows.')).toBeInTheDocument();
  });

  it('renders singular row count note for a single row', () => {
    renderGrid({
      rows: [defaultRows[0]],
      totalRowCount: 1,
    });
    expect(screen.getByText('Query returned 1 row.')).toBeInTheDocument();
  });

  it('renders truncated note when totalRowCount exceeds displayed rows', () => {
    renderGrid({ totalRowCount: 200 });
    expect(screen.getByText('Showing 2 of 200 rows returned by the query.')).toBeInTheDocument();
  });

  it('renders a loading spinner when isLoading is true', () => {
    renderGrid({ isLoading: true, columns: [], rows: [], totalRowCount: 0 });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the empty prompt when no query data is present', () => {
    renderGrid({ columns: [], rows: [], totalRowCount: 0 });
    expect(screen.getByText('No preview available')).toBeInTheDocument();
    expect(screen.getByText('Configure something to see results.')).toBeInTheDocument();
  });

  it('renders the no-results prompt when columns exist but rows are empty', () => {
    renderGrid({ rows: [], totalRowCount: 0 });
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('The query returned no results.')).toBeInTheDocument();
  });

  it('renders the no-results prompt when hasValidQuery is true even with empty columns', () => {
    renderGrid({ columns: [], rows: [], totalRowCount: 0, hasValidQuery: true });
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('The query returned no results.')).toBeInTheDocument();
    expect(screen.queryByText('No preview available')).not.toBeInTheDocument();
  });

  it('renders error callout when isError is true', () => {
    renderGrid({
      isError: true,
      error: 'Syntax error in query',
      columns: [],
      rows: [],
      totalRowCount: 0,
    });
    expect(screen.getByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByText('Syntax error in query')).toBeInTheDocument();
  });

  it('does not render error callout when isError is true but error is null', () => {
    renderGrid({
      isError: true,
      error: null,
      columns: [],
      rows: [],
      totalRowCount: 0,
    });
    expect(screen.queryByText('Preview failed')).not.toBeInTheDocument();
  });

  describe('grouping annotations', () => {
    const groupingColumns: PreviewColumn[] = [
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
      { id: 'count', displayAsText: 'count', esType: 'long' },
      { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
    ];

    const groupingRows = [
      { 'host.name': 'host-1', count: '10', '@timestamp': '2024-01-01T00:00:00Z' },
      { 'host.name': 'host-2', count: '20', '@timestamp': '2024-01-01T00:01:00Z' },
    ];

    it('renders the grouping field column name in the header', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
        groupingFields: ['host.name'],
        uniqueGroupCount: 2,
      });

      expect(screen.getByText('host.name')).toBeInTheDocument();
    });

    it('renders unique group count badge when uniqueGroupCount is provided', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
        groupingFields: ['host.name'],
        uniqueGroupCount: 2,
      });

      expect(screen.getByText('2 unique groups')).toBeInTheDocument();
    });

    it('renders singular group label for one group', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
        groupingFields: ['host.name'],
        uniqueGroupCount: 1,
      });

      expect(screen.getByText('1 unique group')).toBeInTheDocument();
    });

    it('does not render unique group count badge when uniqueGroupCount is null', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
        groupingFields: ['host.name'],
        uniqueGroupCount: null,
      });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });

    it('does not render unique group count badge when uniqueGroupCount is not provided', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
      });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });

    it('does not render unique group count badge when groupingFields is empty', () => {
      renderGrid({
        columns: groupingColumns,
        rows: groupingRows,
        totalRowCount: 2,
        groupingFields: [],
        uniqueGroupCount: null,
      });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });
  });
});
