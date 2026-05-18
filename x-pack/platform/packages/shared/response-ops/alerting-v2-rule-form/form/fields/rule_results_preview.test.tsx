/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createFormWrapper } from '../../test_utils';
import { RuleResultsPreview } from './rule_results_preview';
import * as useRulePreviewModule from '../hooks/use_rule_preview';
import type { RulePreviewResult } from '../hooks/use_rule_preview';

jest.mock('../hooks/use_rule_preview');
jest.mock('./rule_preview_chart', () => ({
  PreviewChart: () => <div data-test-subj="previewChart">Chart Mock</div>,
}));

const mockUseRulePreview = jest.mocked(useRulePreviewModule.useRulePreview);

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-*',
    },
  },
};

const mockPreviewResult: RulePreviewResult = {
  columns: [
    { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
    { id: 'message', displayAsText: 'message', esType: 'keyword' },
  ],
  rows: [
    { '@timestamp': '2024-01-01T00:00:00Z', message: 'Error occurred' },
    { '@timestamp': '2024-01-01T00:01:00Z', message: 'Warning issued' },
  ],
  totalRowCount: 2,
  isLoading: false,
  isError: false,
  error: null,
  groupingFields: [],
  uniqueGroupCount: null,
  hasValidQuery: true,
  query: 'FROM logs-*',
  timeField: '@timestamp',
  lookback: '1m',
};

describe('RuleResultsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRulePreview.mockReturnValue(mockPreviewResult);
  });

  it('renders the title', () => {
    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Rule results preview')).toBeInTheDocument();
  });

  it('renders the data grid with results', () => {
    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByTestId('ruleResultsPreviewGrid')).toBeInTheDocument();
  });

  it('renders row count note', () => {
    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Query returned 2 rows.')).toBeInTheDocument();
  });

  it('renders truncated note when rows exceed max', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      totalRowCount: 200,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Showing 2 of 200 rows returned by the query.')).toBeInTheDocument();
  });

  it('renders loading spinner when loading', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      isLoading: true,
      columns: [],
      rows: [],
      totalRowCount: 0,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    // The spinner is rendered in the header area
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders empty prompt when no query is configured', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: false,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No preview available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Configure a base query, time field, and lookback window to see a preview of matching results.'
      )
    ).toBeInTheDocument();
  });

  it('renders no-results prompt when query returns empty results', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [{ id: '@timestamp', displayAsText: '@timestamp', esType: 'date' }],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: true,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The query returned no results for the configured lookback window. Try adjusting the query or lookback period.'
      )
    ).toBeInTheDocument();
  });

  it('renders no-results prompt when valid query returns 0 results with no columns', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: true,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.queryByText('No preview available')).not.toBeInTheDocument();
  });

  it('renders error callout when query fails', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: true,
      error: 'Query syntax error',
      hasValidQuery: false,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByText('Query syntax error')).toBeInTheDocument();
  });

  it('renders singular row count note for one row', () => {
    mockUseRulePreview.mockReturnValue({
      ...mockPreviewResult,
      rows: [{ '@timestamp': '2024-01-01T00:00:00Z', message: 'Error occurred' }],
      totalRowCount: 1,
    });

    render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Query returned 1 row.')).toBeInTheDocument();
  });

  describe('grouping annotations', () => {
    const groupingPreviewResult: RulePreviewResult = {
      columns: [
        { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
        { id: 'count', displayAsText: 'count', esType: 'long' },
        { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
      ],
      rows: [
        { 'host.name': 'host-1', count: '10', '@timestamp': '2024-01-01T00:00:00Z' },
        { 'host.name': 'host-2', count: '20', '@timestamp': '2024-01-01T00:01:00Z' },
      ],
      totalRowCount: 2,
      isLoading: false,
      isError: false,
      error: null,
      groupingFields: ['host.name'],
      uniqueGroupCount: 2,
      hasValidQuery: true,
      query: 'FROM logs-*',
      timeField: '@timestamp',
      lookback: '1m',
    };

    it('renders a key icon for grouping field columns', () => {
      mockUseRulePreview.mockReturnValue(groupingPreviewResult);

      render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      // The key icon should be rendered as part of the grouping column header
      const keyIcons = screen.getAllByTestId('ruleResultsPreviewGrid');
      expect(keyIcons.length).toBeGreaterThan(0);

      // Check that "Group key field" tooltip content exists
      expect(screen.getByText('host.name')).toBeInTheDocument();
    });

    it('renders unique group count badge when grouping is configured', () => {
      mockUseRulePreview.mockReturnValue(groupingPreviewResult);

      render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.getByText('2 unique groups')).toBeInTheDocument();
    });

    it('renders singular group label for a single group', () => {
      mockUseRulePreview.mockReturnValue({
        ...groupingPreviewResult,
        uniqueGroupCount: 1,
      });

      render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.getByText('1 unique group')).toBeInTheDocument();
    });

    it('does not render unique group count badge when no grouping is configured', () => {
      mockUseRulePreview.mockReturnValue(mockPreviewResult);

      render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });

    it('does not render unique group count badge when uniqueGroupCount is null', () => {
      mockUseRulePreview.mockReturnValue({
        ...groupingPreviewResult,
        groupingFields: ['host.name'],
        uniqueGroupCount: null,
      });

      render(<RuleResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });
  });
});
