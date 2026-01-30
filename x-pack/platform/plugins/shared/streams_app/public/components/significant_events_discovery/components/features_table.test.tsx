/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FeaturesTable } from './features_table';
import { useFetchFeatures, type FeatureWithStream } from '../../../hooks/use_fetch_features';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_fetch_features');
jest.mock('../../../hooks/use_kibana');

const mockUseFetchFeatures = useFetchFeatures as jest.MockedFunction<typeof useFetchFeatures>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

function createMockFeatureWithStream(
  overrides: Partial<FeatureWithStream> = {}
): FeatureWithStream {
  return {
    id: 'feature-123',
    type: 'service',
    name: 'test-feature',
    description: 'A test feature',
    value: { key: 'value' },
    confidence: 80,
    evidence: [],
    tags: [],
    meta: {},
    status: 'active',
    last_seen: '2025-01-01T00:00:00Z',
    stream_name: 'logs',
    ...overrides,
  };
}

const MockSearchBar = ({ onQuerySubmit, placeholder }: any) => (
  <input
    data-testid="mock-search-bar"
    placeholder={placeholder}
    onChange={(e) => onQuerySubmit({ query: { query: e.target.value } })}
  />
);

const MockDatePicker = () => <div data-testid="mock-date-picker">Date Picker</div>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseKibana.mockReturnValue({
    dependencies: {
      start: {
        unifiedSearch: {
          ui: {
            SearchBar: MockSearchBar,
          },
        },
        streams: {
          streamsRepositoryClient: {},
        },
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

describe('FeaturesTable', () => {
  it('shows loading panel when loading and no data', () => {
    mockUseFetchFeatures.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the features table with data', () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'auth-service', title: 'Auth Service' }),
      createMockFeatureWithStream({
        id: 'feature-2',
        name: 'payment-service',
        title: 'Payment Service',
        stream_name: 'metrics',
      }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    expect(screen.getByText('Auth Service')).toBeInTheDocument();
    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByText('Payment Service')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();
    expect(screen.getByText('logs')).toBeInTheDocument();
    expect(screen.getByText('metrics')).toBeInTheDocument();
    expect(screen.getByText('2 Features')).toBeInTheDocument();
  });

  it('shows "No features found" when there are no features', () => {
    mockUseFetchFeatures.mockReturnValue({
      data: { features: [] },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    expect(screen.getByText('No features found')).toBeInTheDocument();
    expect(screen.getByText('0 Features')).toBeInTheDocument();
  });

  it('renders feature type as badge', () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', type: 'service' }),
      createMockFeatureWithStream({ id: 'feature-2', type: 'log_pattern' }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Log_pattern')).toBeInTheDocument();
  });

  it('renders confidence with health indicator', () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', confidence: 80 }),
      createMockFeatureWithStream({ id: 'feature-2', confidence: 50 }),
      createMockFeatureWithStream({ id: 'feature-3', confidence: 30 }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders feature name link that opens details flyout', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'auth-service', title: 'Auth Service' }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    const featureLink = screen.getByTestId('featuresDiscoveryFeatureNameLink');
    fireEvent.click(featureLink);

    // The flyout should appear with the feature title
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders details button that opens flyout', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'auth-service', title: 'Auth Service' }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    const detailsButton = screen.getByTestId('featuresDiscoveryDetailsButton');
    fireEvent.click(detailsButton);

    // The flyout should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('displays value as title when title is not provided', () => {
    const mockFeatures = [
      createMockFeatureWithStream({
        id: 'feature-1',
        name: 'feature-name',
        title: undefined,
        value: { service: 'my-service', host: 'localhost' },
      }),
    ];

    mockUseFetchFeatures.mockReturnValue({
      data: { features: mockFeatures },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FeaturesTable />);

    // The value should be displayed as comma-separated values
    expect(screen.getByText('my-service, localhost')).toBeInTheDocument();
    expect(screen.getByText('feature-name')).toBeInTheDocument();
  });
});
