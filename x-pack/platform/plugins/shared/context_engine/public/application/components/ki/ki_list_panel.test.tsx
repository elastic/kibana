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
import { KiListPanel } from './ki_list_panel';

const mockUseKiList = jest.fn();

jest.mock('../../hooks/use_ki_list', () => ({
  useKiList: (...args: unknown[]) => mockUseKiList(...args),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'sample-ki',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-sample-ki' },
  automations: [],
  sources: [{ type: 'connector', value: 'connector-1' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const SAMPLE_INDEX_MANAGEMENT_URL =
  '/app/management/data/index_management/indices/index_details?indexName=ai-index-idx-sample-ki';
const SAMPLE_DISCOVER_URL = '/app/discover#/?_a=(query:(esql:FROM%20ai-index-idx-sample-ki))';

interface RenderOptions {
  discoverShow?: boolean;
}

const renderWithProviders = (ui: React.ReactElement, options: RenderOptions = {}) => {
  const { discoverShow = true } = options;
  const services = {
    ...coreMock.createStart(),
    share: sharePluginMock.createStartContract(),
  };
  services.application.capabilities = {
    ...services.application.capabilities,
    discover_v2: { show: discoverShow },
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

describe('KiListPanel', () => {
  const stableCountsByType = [
    { type: 'playbook', count: 1 },
    { type: 'policy', count: 1 },
    { type: 'faq', count: 4 },
  ];

  beforeEach(() => {
    mockUseKiList.mockImplementation(({ type }: { type?: string }) => ({
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

  it('renders the list rows and type filters from counts_by_type', async () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListPanelContent')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListRows')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('Refund playbook');
    expect(screen.getByTestId('contextKiListFilter-all')).toHaveTextContent('All (6)');
    expect(screen.getByTestId('contextKiListFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-policy')).toBeInTheDocument();
    expect(screen.queryByTestId('contextKiListFilter-others')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('contextKiListPanelDestLink')).toHaveAttribute(
        'href',
        SAMPLE_INDEX_MANAGEMENT_URL
      );
    });
  });

  it('requests a type filter when a type button is selected', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(mockUseKiList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'playbook',
      })
    );
  });

  it('keeps all type filter buttons visible after selecting a type', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(screen.getByTestId('contextKiListFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-playbook')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-policy')).toBeInTheDocument();
    expect(screen.getByTestId('contextKiListFilter-faq')).toBeInTheDocument();
  });

  it('keeps the header summary count at the unfiltered total when a type is selected', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListFilter-playbook'));

    expect(screen.getByTestId('contextKiListPanelSummary')).toHaveTextContent(
      '6 Knowledge Indicators in ai-index-idx-sample-ki'
    );
  });

  it('shows a loading skeleton while the first page is loading', () => {
    mockUseKiList.mockReturnValue({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextKiListRows')).not.toBeInTheDocument();
  });

  it('shows an error message when the list request fails', () => {
    mockUseKiList.mockReturnValue({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListError')).toHaveTextContent(
      'Unable to load Knowledge Indicators.'
    );
  });

  it('shows an empty state when there are no Knowledge Indicators', () => {
    mockUseKiList.mockReturnValue({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextKiListTypeFilters')).not.toBeInTheDocument();
  });

  it('renders a Discover link when discover is available', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    expect(screen.getByTestId('contextKiListDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
  });

  it('hides the Discover link when discover is unavailable', () => {
    renderWithProviders(<KiListPanel aiIndex={aiIndex} />, { discoverShow: false });

    expect(screen.queryByTestId('contextKiListDiscoverLink')).not.toBeInTheDocument();
  });

  it('renders the destination as plain text for index patterns', () => {
    renderWithProviders(
      <KiListPanel
        aiIndex={{
          ...aiIndex,
          dest: { type: 'index', value: 'ai-index-idx-logs-*' },
        }}
      />
    );

    expect(screen.getByTestId('contextKiListPanelDest')).toHaveTextContent('ai-index-idx-logs-*');
    expect(screen.queryByTestId('contextKiListPanelDestLink')).not.toBeInTheDocument();
  });

  it('requests a larger page size when load more is clicked', () => {
    mockUseKiList.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    fireEvent.click(screen.getByTestId('contextKiListLoadMoreButton'));

    expect(mockUseKiList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        size: DEFAULT_KI_PAGE_SIZE * 2,
      })
    );
  });

  it('shows the cap reached message with a Discover link at the max page size', () => {
    mockUseKiList.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />);

    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextKiListLoadMoreButton'));
    }

    expect(screen.getByTestId('contextKiListCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.getByTestId('contextKiListCapReachedDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
    expect(screen.queryByTestId('contextKiListLoadMoreButton')).not.toBeInTheDocument();
  });

  it('shows the cap reached message without a Discover link when discover is unavailable', () => {
    mockUseKiList.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
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

    renderWithProviders(<KiListPanel aiIndex={aiIndex} />, { discoverShow: false });

    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextKiListLoadMoreButton'));
    }

    expect(screen.getByTestId('contextKiListCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.queryByTestId('contextKiListCapReachedDiscoverLink')).not.toBeInTheDocument();
  });
});
