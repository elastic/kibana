/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TestProvider } from '../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
import { DataUsageMetricsPage } from './data_usage_metrics_page';
import { coreMock as mockCore } from '@kbn/core/public/mocks';
import { useGetDataUsageMetrics } from '../hooks/use_get_usage_metrics';
import { useGetDataUsageDataStreams } from '../hooks/use_get_data_streams';
import { mockUseKibana } from './mocks';

jest.mock('../hooks/use_get_usage_metrics');
jest.mock('../hooks/use_get_data_streams');
const mockServices = mockCore.createStart();
jest.mock('../utils/use_breadcrumbs', () => {
  return {
    useBreadcrumbs: jest.fn(),
  };
});
jest.mock('../utils/use_kibana', () => {
  return {
    useKibanaContextForPlugin: () => ({
      services: mockServices,
    }),
  };
});

const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
    listen: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => mockUseKibana,
  };
});

const mockUseGetDataUsageMetrics = useGetDataUsageMetrics as jest.Mock;
const mockUseGetDataUsageDataStreams = useGetDataUsageDataStreams as jest.Mock;

const getBaseMockedDataStreams = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: jest.fn(),
});
const getBaseMockedDataUsageMetrics = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: jest.fn(),
});

describe('DataUsageMetrics Page', () => {
  const testId = 'test';
  let renderComponent: () => RenderResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
