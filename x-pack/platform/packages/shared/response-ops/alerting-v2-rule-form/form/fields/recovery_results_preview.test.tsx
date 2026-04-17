/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createFormWrapper } from '../../test_utils';
import { RecoveryResultsPreview } from './recovery_results_preview';
import * as useRecoveryPreviewModule from '../hooks/use_recovery_preview';
import type { PreviewResult } from '../hooks/use_preview';

jest.mock('../hooks/use_recovery_preview');
jest.mock('./rule_preview_chart', () => ({
  PreviewChart: () => <div data-test-subj="previewChart">Chart Mock</div>,
}));

const mockUseRecoveryPreview = jest.mocked(useRecoveryPreviewModule.useRecoveryPreview);

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-*',
    },
  },
  recoveryPolicy: {
    type: 'query' as const,
    query: {
      base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
    },
  },
};

const mockPreviewResult: PreviewResult = {
  columns: [
    { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
    { id: 'count', displayAsText: 'count', esType: 'long' },
  ],
  rows: [
    { 'host.name': 'host-1', count: '3' },
    { 'host.name': 'host-2', count: '1' },
  ],
  totalRowCount: 2,
  isLoading: false,
  isError: false,
  error: null,
  groupingFields: ['host.name'],
  uniqueGroupCount: 2,
  hasValidQuery: true,
  query: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
  timeField: '@timestamp',
  lookback: '1m',
};

describe('RecoveryResultsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecoveryPreview.mockReturnValue(mockPreviewResult);
  });

  it('renders the title', () => {
    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Recovery results preview')).toBeInTheDocument();
  });

  it('renders the data grid with results', () => {
    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByTestId('recoveryResultsPreviewGrid')).toBeInTheDocument();
  });

  it('renders row count note', () => {
    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Query returned 2 rows.')).toBeInTheDocument();
  });

  it('renders truncated note when rows exceed max', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      totalRowCount: 200,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Showing 2 of 200 rows returned by the query.')).toBeInTheDocument();
  });

  it('renders loading spinner when loading', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      isLoading: true,
      columns: [],
      rows: [],
      totalRowCount: 0,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders empty prompt when no query is configured', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: false,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No preview available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Configure a recovery query to see a preview of results that would resolve active alerts.'
      )
    ).toBeInTheDocument();
  });

  it('renders no-results prompt when query returns empty results', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [{ id: 'host.name', displayAsText: 'host.name', esType: 'keyword' }],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: true,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The recovery query returned no results for the configured lookback window. Try adjusting the recovery query or lookback period.'
      )
    ).toBeInTheDocument();
  });

  it('renders no-results prompt when valid query returns 0 results with no columns', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: false,
      error: null,
      hasValidQuery: true,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.queryByText('No preview available')).not.toBeInTheDocument();
  });

  it('renders error callout when query fails', () => {
    mockUseRecoveryPreview.mockReturnValue({
      ...mockPreviewResult,
      columns: [],
      rows: [],
      totalRowCount: 0,
      isLoading: false,
      isError: true,
      error: 'Recovery query syntax error',
      hasValidQuery: false,
    });

    render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

    expect(screen.getByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByText('Recovery query syntax error')).toBeInTheDocument();
  });

  describe('grouping annotations', () => {
    it('renders unique group count badge when grouping is configured', () => {
      mockUseRecoveryPreview.mockReturnValue(mockPreviewResult);

      render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.getByText('2 unique groups')).toBeInTheDocument();
    });

    it('renders singular group label for a single group', () => {
      mockUseRecoveryPreview.mockReturnValue({
        ...mockPreviewResult,
        uniqueGroupCount: 1,
      });

      render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.getByText('1 unique group')).toBeInTheDocument();
    });

    it('does not render unique group count badge when no grouping is configured', () => {
      mockUseRecoveryPreview.mockReturnValue({
        ...mockPreviewResult,
        groupingFields: [],
        uniqueGroupCount: null,
      });

      render(<RecoveryResultsPreview />, { wrapper: createFormWrapper(defaultFormValues) });

      expect(screen.queryByText(/unique group/)).not.toBeInTheDocument();
    });
  });
});
