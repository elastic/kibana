/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { getViewKiPath } from '../../paths';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();
const mockNavigateToContextEngine = jest.fn();

jest.mock('../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    createContextEngineUrl: (path: string) => path,
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'sample-ki',
  managed: false,
  memory_enabled: false,
  dest: { type: 'index', value: 'ai-index-idx-sample-ki' },
  automations: [],
  sources: [{ type: 'connector', value: 'connector-1' }],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const SAMPLE_INDEX_MANAGEMENT_URL =
  '/app/management/data/index_management/indices/index_details?indexName=ai-index-idx-sample-ki';
const SAMPLE_DISCOVER_URL = '/app/discover#/?_a=(query:(esql:FROM%20ai-index-idx-sample-ki))';

const selectTypeFilter = (type: string) => {
  fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
  fireEvent.click(screen.getByTestId(`contextListKiFilter-${type}`));
};

interface RenderOptions {
  discoverShow?: boolean;
  indexManagementMonitor?: boolean;
}

const renderWithProviders = (ui: React.ReactElement, options: RenderOptions = {}) => {
  const { discoverShow = true, indexManagementMonitor = true } = options;
  const services = {
    ...coreMock.createStart(),
    share: sharePluginMock.createStartContract(),
  };
  services.application.capabilities = {
    ...services.application.capabilities,
    discover_v2: { show: discoverShow },
    index_management: {
      ...services.application.capabilities.index_management,
      monitor: indexManagementMonitor,
    },
  };

  const indexManagementLocator = sharePluginMock.createLocator();
  indexManagementLocator.getUrl.mockResolvedValue(SAMPLE_INDEX_MANAGEMENT_URL);
  const discoverLocator = sharePluginMock.createLocator();
  discoverLocator.getRedirectUrl.mockReturnValue(SAMPLE_DISCOVER_URL);
  jest.spyOn(services.share.url.locators, 'get').mockImplementation((locatorId: string) => {
    if (locatorId === INDEX_MANAGEMENT_LOCATOR_ID) {
      return indexManagementLocator;
    }
    if (locatorId === DISCOVER_APP_LOCATOR) {
      return discoverLocator;
    }
    return undefined;
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ListKiPanel', () => {
  const stableCountsByType = [
    { type: 'playbook', count: 1 },
    { type: 'policy', count: 1 },
    { type: 'faq', count: 4 },
  ];

  beforeEach(() => {
    mockUseListKi.mockImplementation(({ type }: { type?: string }) => ({
      kis: [
        {
          id: 'ki-1',
          index: 'ai-index-idx-sample-ki',
          type: 'playbook',
          title: 'Refund playbook',
        },
      ],
      total: type === undefined ? 6 : 1,
      summary: {
        total: 6,
        countsByType: stableCountsByType,
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to KI detail when a row is clicked', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiRow'));

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(getViewKiPath('sample-ki', 'ki-1'), {
      index: 'ai-index-idx-sample-ki',
    });
  });

  it('renders the list rows and type filters from counts_by_type', async () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextListKiPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiRows')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('Refund playbook');
    expect(screen.getByTestId('contextListKiTypeFilters')).toHaveTextContent('All (6)');
    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-policy')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('contextListKiPanelDestLink')).toHaveAttribute(
        'href',
        SAMPLE_INDEX_MANAGEMENT_URL
      );
    });
  });

  it('renders the backing index as plain text when the user lacks index management access', async () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />, { indexManagementMonitor: false });

    await waitFor(() => {
      expect(screen.getByTestId('contextListKiPanelDest')).toHaveTextContent(
        'ai-index-idx-sample-ki'
      );
    });
    expect(screen.queryByTestId('contextListKiPanelDestLink')).not.toBeInTheDocument();
  });

  it('requests a type filter when a type is selected from the dropdown', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    selectTypeFilter('playbook');

    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'playbook',
      })
    );
  });

  it('keeps all type filter options in the dropdown after selecting a type', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    selectTypeFilter('playbook');

    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-policy')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-faq')).toBeInTheDocument();
  });

  it('keeps the backing index label unchanged when a type is selected', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    selectTypeFilter('playbook');

    expect(screen.getByTestId('contextListKiPanelSummary')).toHaveTextContent(
      'Backing index ai-index-idx-sample-ki'
    );
  });

  it('shows a loading skeleton while the first page is loading', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: {
        total: 0,
        countsByType: [],
      },
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch: jest.fn(),
    });

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextListKiLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiRows')).not.toBeInTheDocument();
  });

  it('shows an error message when the list request fails', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: {
        total: 0,
        countsByType: [],
      },
      isLoading: false,
      isFetching: false,
      error: new Error('boom'),
      refetch: jest.fn(),
    });

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextListKiError')).toHaveTextContent(
      'Unable to load Knowledge Indicators.'
    );
  });

  it('shows an empty state when there are no Knowledge Indicators', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: {
        total: 0,
        countsByType: [],
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextListKiEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiTypeFilters')).not.toBeInTheDocument();
  });

  it('renders a Discover link when discover is available', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextListKiDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
  });

  it('hides the Discover link when discover is unavailable', () => {
    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />, { discoverShow: false });

    expect(screen.queryByTestId('contextListKiDiscoverLink')).not.toBeInTheDocument();
  });

  it('renders the destination as plain text for index patterns', () => {
    renderWithProviders(
      <ListKiPanel
        aiIndex={{
          ...aiIndex,
          dest: { type: 'index', value: 'ai-index-idx-logs-*' },
        }}
      />
    );

    expect(screen.getByTestId('contextListKiPanelDest')).toHaveTextContent('ai-index-idx-logs-*');
    expect(screen.queryByTestId('contextListKiPanelDestLink')).not.toBeInTheDocument();
  });

  it('requests a larger page size when load more is clicked', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 50,
      summary: {
        total: 50,
        countsByType: [{ type: 'playbook', count: 50 }],
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));

    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        size: DEFAULT_KI_PAGE_SIZE * 2,
      })
    );
  });

  it('shows the cap reached message with a Discover link at the max page size', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 150,
      summary: {
        total: 150,
        countsByType: [{ type: 'playbook', count: 150 }],
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />);

    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));
    }

    expect(screen.getByTestId('contextListKiCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.getByTestId('contextListKiCapReachedDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
    expect(screen.queryByTestId('contextListKiLoadMoreButton')).not.toBeInTheDocument();
  });

  it('shows the cap reached message without a Discover link when discover is unavailable', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 150,
      summary: {
        total: 150,
        countsByType: [{ type: 'playbook', count: 150 }],
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderWithProviders(<ListKiPanel aiIndex={aiIndex} />, { discoverShow: false });

    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));
    }

    expect(screen.getByTestId('contextListKiCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.queryByTestId('contextListKiCapReachedDiscoverLink')).not.toBeInTheDocument();
  });
});
