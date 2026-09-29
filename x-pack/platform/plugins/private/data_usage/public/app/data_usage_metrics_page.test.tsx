/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { TestProvider } from '../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
import { DataUsageMetricsPage } from './data_usage_metrics_page';
import { coreMock as mockCore } from '@kbn/core/public/mocks';
import { useGetDataUsageMetrics } from '../hooks/use_get_usage_metrics';
import { useGetDataUsageDataStreams } from '../hooks/use_get_data_streams';
import { mockUseKibana } from './mocks';

vi.mock('../hooks/use_get_usage_metrics');
vi.mock('../hooks/use_get_data_streams');
const mockServices = mockCore.createStart();
vi.mock('../utils/use_breadcrumbs', () => {
  return {
    useBreadcrumbs: vi.fn(),
  };
});
vi.mock('../utils/use_kibana', () => {
  return {
    useKibanaContextForPlugin: () => ({
      services: mockServices,
    }),
  };
});

const mockUseLocation = vi.fn(() => ({ pathname: '/' }));
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useLocation: () => mockUseLocation(),
    useHistory: vi.fn().mockReturnValue({
      push: vi.fn(),
      listen: vi.fn(),
      location: {
        search: '',
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const original = await vi.importActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => mockUseKibana,
  };
});

const mockUseGetDataUsageMetrics = useGetDataUsageMetrics as Mock;
const mockUseGetDataUsageDataStreams = useGetDataUsageDataStreams as Mock;

const getBaseMockedDataStreams = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: vi.fn(),
});
const getBaseMockedDataUsageMetrics = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: vi.fn(),
});

describe('DataUsageMetrics Page', () => {
  const testId = 'test';
  let renderComponent: () => RenderResult;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    renderComponent = () =>
      render(
        <TestProvider>
          <DataUsageMetricsPage data-test-subj={testId} />
        </TestProvider>
      );
    mockUseGetDataUsageMetrics.mockReturnValue(getBaseMockedDataUsageMetrics);
    mockUseGetDataUsageDataStreams.mockReturnValue(getBaseMockedDataStreams);
  });

  it('renders', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-page-header`)).toBeTruthy();
  });

  it('should show page title', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-page-title`)).toBeTruthy();
    expect(getByTestId(`${testId}-page-title`)).toHaveTextContent('Data Usage');
  });

  it('should show page description', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-page-description`)).toBeTruthy();
    expect(getByTestId(`${testId}-page-description`)).toHaveTextContent(
      'Monitor data ingested and retained by data streams over the past 10 days.'
    );
  });
});
