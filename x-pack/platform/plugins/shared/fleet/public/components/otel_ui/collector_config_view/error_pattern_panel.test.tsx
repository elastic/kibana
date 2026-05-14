/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import type { TestRenderer } from '../../../mock';
import { createFleetTestRendererMock } from '../../../mock';

import type { UseErrorPatternsResult } from './use_error_patterns';
import { ErrorPatternPanel } from './error_pattern_panel';

const mockUseErrorPatterns = jest.fn<UseErrorPatternsResult, any>();
jest.mock('./use_error_patterns', () => ({
  useErrorPatterns: (...args: any[]) => mockUseErrorPatterns(...args),
}));

jest.mock('./collector_context', () => ({
  useCollectorContext: () => ({ serviceInstanceId: 'collector-001' }),
}));

const mockGetRedirectUrl = jest.fn().mockReturnValue('http://discover-link');
jest.mock('../../../hooks/use_locator', () => ({
  useDiscoverLocator: () => ({ getRedirectUrl: mockGetRedirectUrl }),
}));

const makePattern = (overrides?: Partial<UseErrorPatternsResult>): UseErrorPatternsResult => ({
  errorPatterns: [
    {
      key: 'Failed to export spans connection refused',
      pattern: 'Failed to export spans connection refused',
      docCount: 42,
      firstSeen: '2026-05-07T10:00:00.000Z',
      lastSeen: '2026-05-07T14:00:00.000Z',
      exampleMessage: 'Failed to export spans: connection refused to endpoint https://es:9200',
      component: 'exporter/elasticsearch',
    },
    {
      key: 'TLS handshake failed certificate expired',
      pattern: 'TLS handshake failed certificate expired',
      docCount: 10,
      firstSeen: '2026-05-07T11:00:00.000Z',
      lastSeen: '2026-05-07T13:00:00.000Z',
      exampleMessage: 'TLS handshake failed: certificate has expired for host es-cluster.internal',
      component: null,
    },
  ],
  warningPatterns: [
    {
      key: 'Exporter queue nearing capacity',
      pattern: 'Exporter queue nearing capacity',
      docCount: 15,
      firstSeen: '2026-05-07T09:00:00.000Z',
      lastSeen: '2026-05-07T14:30:00.000Z',
      exampleMessage: 'Exporter queue nearing capacity: 8500/10000 items pending',
      component: 'exporter/elasticsearch',
    },
  ],
  errorCount: 2,
  warningCount: 1,
  totalLogCount: 67,
  isLoading: false,
  ...overrides,
});

describe('ErrorPatternPanel', () => {
  let testRenderer: TestRenderer;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockUseErrorPatterns.mockReturnValue(makePattern());
    mockGetRedirectUrl.mockReturnValue('http://discover-link');
  });

  it('renders the panel with title and table', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(result.getByTestId('collectorErrorPatternPanel')).toBeInTheDocument();
    expect(result.getByText('Error patterns')).toBeInTheDocument();
    expect(result.getByTestId('errorPatternTable')).toBeInTheDocument();
  });

  it('shows error patterns by default', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(result.getByText('Failed to export spans connection refused')).toBeInTheDocument();
    expect(result.getByText('TLS handshake failed certificate expired')).toBeInTheDocument();
  });

  it('switches to warning patterns when warning toggle is clicked', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    fireEvent.click(result.getByTestId('errorPatternLevelToggle-warning'));

    expect(result.getByText('Exporter queue nearing capacity')).toBeInTheDocument();
    expect(result.queryByText('Failed to export spans connection refused')).not.toBeInTheDocument();
  });

  it('shows correct counts in toggle buttons', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(result.getByTestId('errorPatternLevelToggle-error')).toHaveTextContent('Errors (2)');
    expect(result.getByTestId('errorPatternLevelToggle-warning')).toHaveTextContent('Warnings (1)');
  });

  it('shows empty message when no patterns exist', () => {
    mockUseErrorPatterns.mockReturnValue(
      makePattern({
        errorPatterns: [],
        errorCount: 0,
        totalLogCount: 0,
      })
    );

    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(
      result.getByText('No error patterns found in the selected time range')
    ).toBeInTheDocument();
  });

  it('shows warning empty message when viewing warnings with none', () => {
    mockUseErrorPatterns.mockReturnValue(
      makePattern({
        warningPatterns: [],
        warningCount: 0,
      })
    );

    const result = testRenderer.render(<ErrorPatternPanel />);
    fireEvent.click(result.getByTestId('errorPatternLevelToggle-warning'));

    expect(
      result.getByText('No warning patterns found in the selected time range')
    ).toBeInTheDocument();
  });

  it('renders discover link for each pattern row', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    const discoverButtons = result.getAllByLabelText('Explore matching logs in Kibana Discover');
    expect(discoverButtons).toHaveLength(2);
    expect(discoverButtons[0]).toHaveAttribute('href', 'http://discover-link');
  });

  it('hides discover links when locator returns undefined', () => {
    mockGetRedirectUrl.mockReturnValue(undefined);

    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(result.queryAllByLabelText('Explore matching logs in Kibana Discover')).toHaveLength(0);
  });

  it('passes serviceInstanceId and default timeRange to the hook', () => {
    testRenderer.render(<ErrorPatternPanel />);

    expect(mockUseErrorPatterns).toHaveBeenCalledWith({
      serviceInstanceId: 'collector-001',
      timeRange: '1h',
    });
  });

  it('updates timeRange when selector changes', () => {
    const result = testRenderer.render(<ErrorPatternPanel />);

    fireEvent.change(result.getByTestId('errorPatternTimeRange'), { target: { value: '1d' } });

    expect(mockUseErrorPatterns).toHaveBeenLastCalledWith({
      serviceInstanceId: 'collector-001',
      timeRange: '1d',
    });
  });

  it('renders loading state', () => {
    mockUseErrorPatterns.mockReturnValue(makePattern({ isLoading: true }));

    const result = testRenderer.render(<ErrorPatternPanel />);

    expect(result.getByTestId('errorPatternTable')).toBeInTheDocument();
  });

  it('does not apply color to error toggle when error count is 0', () => {
    mockUseErrorPatterns.mockReturnValue(
      makePattern({ errorPatterns: [], errorCount: 0, totalLogCount: 15 })
    );

    const result = testRenderer.render(<ErrorPatternPanel />);
    const errorButton = result.getByTestId('errorPatternLevelToggle-error');

    expect(errorButton).not.toHaveClass('euiFilterButton--danger');
  });

  it('does not apply color to warning toggle when warning count is 0', () => {
    mockUseErrorPatterns.mockReturnValue(
      makePattern({ warningPatterns: [], warningCount: 0, totalLogCount: 52 })
    );

    const result = testRenderer.render(<ErrorPatternPanel />);
    fireEvent.click(result.getByTestId('errorPatternLevelToggle-warning'));

    const warningButton = result.getByTestId('errorPatternLevelToggle-warning');
    expect(warningButton).not.toHaveClass('euiFilterButton--warning');
  });
});
