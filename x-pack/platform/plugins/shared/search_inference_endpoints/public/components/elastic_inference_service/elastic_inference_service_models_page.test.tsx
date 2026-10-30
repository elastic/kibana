/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ElasticInferenceServiceModelsPage } from './elastic_inference_service_models_page';
import { EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY } from '../../hooks/use_display_options_tour';
import type { EisInferenceEndpoint } from '../../../common/types';
import { useEisModels } from '../../hooks/use_eis_models';
import type { EisPageState } from '../../hooks/use_eis_page_state';
import { InferenceEndpoints } from '../../__mocks__/inference_endpoints';
import { groupEndpointsByModel } from '../../utils/eis_utils';

jest.mock('../../hooks/use_eis_models');
jest.mock('../../hooks/use_kibana');

const { useKibana } = jest.requireMock('../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;

const mockNavigateToApp = jest.fn();
const mockShowErrorDialog = jest.fn();

const mockKibanaReturn = ({
  manage = true,
  toursEnabled = true,
}: { manage?: boolean; toursEnabled?: boolean } = {}) => ({
  services: {
    notifications: {
      toasts: { addSuccess: jest.fn(), addDanger: jest.fn() },
      tours: { isEnabled: () => toursEnabled },
      showErrorDialog: mockShowErrorDialog,
    },
    application: {
      capabilities: { searchInferenceEndpoints: { show: true, manage } },
      navigateToApp: mockNavigateToApp,
    },
  },
});

// The Content List provider owns its own React Query client, so only
// `useQueryClient` (used for endpoint-save invalidation) is stubbed.
jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockUseEisModels = useEisModels as jest.Mock;

const endpoints = InferenceEndpoints.filter((ep) => ep.service === 'elastic');

const SEARCH_BOX = 'contentListToolbar-searchBox';
const SORT_MENU_BUTTON = 'eisModelsSortMenuButton';
const RESULTS_SUMMARY = 'eisModelsResultsSummary';

const countCards = (container: HTMLElement) =>
  container.querySelectorAll('[data-test-subj^="eisModelCard-"]').length;

const getFirstCardTestSubj = (container: HTMLElement) =>
  container.querySelector('[data-test-subj^="eisModelCard-"]')?.getAttribute('data-test-subj') ??
  '';

const selectSortOption = async (
  getByTestId: ReturnType<typeof render>['getByTestId'],
  optionId: string
) => {
  fireEvent.click(getByTestId(SORT_MENU_BUTTON));
  const option = await waitFor(() => getByTestId(`eisModelsSortOption-${optionId}`));
  fireEvent.click(option);
};

const sortTestEndpoints: EisInferenceEndpoint[] = [
  {
    inference_id: 'alpha-model',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'alpha-model-id' },
    metadata: {
      heuristics: { status: 'ga', release_date: '2024-01-01' },
      display: { name: 'Alpha Sort Model', model_creator: 'Elastic' },
    },
  },
  {
    inference_id: 'zeta-model',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'zeta-model-id' },
    metadata: {
      heuristics: { status: 'ga', release_date: '2026-06-01' },
      display: { name: 'Zeta Sort Model', model_creator: 'Elastic' },
    },
  },
];

// The page mounts under the app's `Router`, which is what enables the Content
// List's URL sync — omitting it here hid a filtering regression from jest.
const renderPage = (pageState: EisPageState = 'models') =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <Router history={createMemoryHistory()}>
          <ElasticInferenceServiceModelsPage
            pageState={pageState}
            isCloudConnectPromoVisible={false}
          />
        </Router>
      </I18nProvider>
    </EuiThemeProvider>
  );

const renderPopulatedPage = async () => {
  mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
  const utils = renderPage();
  await waitFor(() => expect(countCards(utils.container)).toBeGreaterThan(0));
  return utils;
};

describe('ElasticInferenceServiceModelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue(mockKibanaReturn());
    window.localStorage.clear();
  });

  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { getByTestId } = renderPage('loading');
    expect(getByTestId('eisModelsLoadingSpinner')).toBeInTheDocument();
  });

  describe('Elastic Inference Service unavailable', () => {
    const error = new Error('Service unavailable');
    const refetch = jest.fn();

    it('renders the unavailable prompt without the models grid', () => {
      mockUseEisModels.mockReturnValue({ data: undefined, isError: true, error, refetch });
      const { getByTestId, queryByTestId } = renderPage('unavailable');
      expect(getByTestId('eisUnavailablePrompt')).toBeInTheDocument();
      expect(queryByTestId(SEARCH_BOX)).not.toBeInTheDocument();
    });

    it('refetches the models when Retry is clicked', () => {
      mockUseEisModels.mockReturnValue({ data: undefined, isError: true, error, refetch });
      const { getByTestId } = renderPage('unavailable');
      fireEvent.click(getByTestId('eisUnavailableRetryButton'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('opens the error dialog when View error details is clicked', () => {
      mockUseEisModels.mockReturnValue({ data: undefined, isError: true, error, refetch });
      const { getByTestId } = renderPage('unavailable');
      fireEvent.click(getByTestId('eisUnavailableErrorDetailsButton'));
      expect(mockShowErrorDialog).toHaveBeenCalledWith({
        title: 'Elastic Inference Service unavailable',
        error,
      });
    });

    it('shows a loading Retry button while refetching', () => {
      mockUseEisModels.mockReturnValue({
        data: undefined,
        isError: true,
        isFetching: true,
        error,
        refetch,
      });
      const { getByTestId } = renderPage('unavailable');
      expect(getByTestId('eisUnavailableRetryButton')).toBeDisabled();
    });

    it('hides View error details when there is no error', () => {
      mockUseEisModels.mockReturnValue({ data: [], error: null, refetch });
      const { queryByTestId } = renderPage('unavailable');
      expect(queryByTestId('eisUnavailableErrorDetailsButton')).not.toBeInTheDocument();
    });
  });

  describe('self-managed without Elastic Inference Service', () => {
    it('renders the self-managed empty prompt without the models grid', () => {
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
      const { getByTestId, queryByTestId } = renderPage('selfManagedEmpty');
      expect(getByTestId('eisSelfManagedEmptyPrompt')).toBeInTheDocument();
      expect(getByTestId('eisDocumentationLink')).toBeInTheDocument();
      expect(queryByTestId(SEARCH_BOX)).not.toBeInTheDocument();
    });

    it('opens Cloud Connect when Connect your cluster is clicked', () => {
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
      const { getByTestId } = renderPage('selfManagedEmpty');
      fireEvent.click(getByTestId('eisConnectYourClusterButton'));
      expect(mockNavigateToApp).toHaveBeenCalledWith('cloud_connect', { openInNewTab: true });
    });
  });

  describe('Elastic Inference Service disabled in Cloud Connect', () => {
    it('renders the disabled callout above the models grid', async () => {
      mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
      const { container, getByTestId } = renderPage('serviceDisabled');
      expect(getByTestId('eisServiceDisabledCallout')).toBeInTheDocument();
      await waitFor(() => expect(countCards(container)).toBeGreaterThan(0));
    });

    it('opens Cloud Connect when Open Cloud Connect is clicked', () => {
      mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
      const { getByTestId } = renderPage('serviceDisabled');
      fireEvent.click(getByTestId('eisOpenCloudConnectButton'));
      expect(mockNavigateToApp).toHaveBeenCalledWith('cloud_connect', { openInNewTab: true });
    });

    it('does not render the disabled callout when the service is enabled', async () => {
      const { queryByTestId } = await renderPopulatedPage();
      expect(queryByTestId('eisServiceDisabledCallout')).not.toBeInTheDocument();
    });
  });

  it('renders model cards when data is loaded', async () => {
    const { container } = await renderPopulatedPage();
    expect(countCards(container)).toBeGreaterThan(0);
  });

  it('renders the sort menu with the default sort selected', async () => {
    const { getByTestId } = await renderPopulatedPage();
    expect(getByTestId(SORT_MENU_BUTTON)).toHaveTextContent('Sort by: A → Z');
  });

  it('shows the visible models out of the full catalog in the results summary', async () => {
    const { container, getByTestId } = await renderPopulatedPage();
    const total = groupEndpointsByModel(endpoints).length;
    expect(countCards(container)).toBeLessThan(total);
    expect(getByTestId(RESULTS_SUMMARY)).toHaveTextContent(
      `Showing ${countCards(container)} of ${total}`
    );
  });

  it('updates the results summary when search narrows models', async () => {
    const { getByTestId } = await renderPopulatedPage();
    const total = groupEndpointsByModel(endpoints).length;

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'Jina Reranker v2' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(getByTestId(RESULTS_SUMMARY)).toHaveTextContent(`Showing 1 of ${total}`)
    );
  });

  it('reorders model cards when the sort option changes', async () => {
    mockUseEisModels.mockReturnValue({
      data: sortTestEndpoints,
      isLoading: false,
      isError: false,
    });
    const { container, getByTestId } = renderPage();
    await waitFor(() => expect(countCards(container)).toBe(2));
    expect(getFirstCardTestSubj(container)).toBe('eisModelCard-Alpha Sort Model');

    await selectSortOption(getByTestId, 'nameDesc');
    await waitFor(() =>
      expect(getFirstCardTestSubj(container)).toBe('eisModelCard-Zeta Sort Model')
    );

    await selectSortOption(getByTestId, 'releasedDesc');
    await waitFor(() =>
      expect(getFirstCardTestSubj(container)).toBe('eisModelCard-Zeta Sort Model')
    );
    expect(getByTestId(SORT_MENU_BUTTON)).toHaveTextContent('Sort by: Newest');

    await selectSortOption(getByTestId, 'releasedAsc');
    await waitFor(() =>
      expect(getFirstCardTestSubj(container)).toBe('eisModelCard-Alpha Sort Model')
    );
  });

  it('keeps search filtering when the sort option changes', async () => {
    mockUseEisModels.mockReturnValue({
      data: sortTestEndpoints,
      isLoading: false,
      isError: false,
    });
    const { container, getByTestId, queryByTestId } = renderPage();
    await waitFor(() => expect(countCards(container)).toBe(2));

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'Alpha' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(countCards(container)).toBe(1));
    expect(queryByTestId('eisModelCard-Zeta Sort Model')).not.toBeInTheDocument();

    await selectSortOption(getByTestId, 'nameDesc');
    await waitFor(() => expect(countCards(container)).toBe(1));
    expect(getByTestId('eisModelCard-Alpha Sort Model')).toBeInTheDocument();
    expect(getByTestId(RESULTS_SUMMARY)).toHaveTextContent('Showing 1 of 2');
  });

  it('renders empty state when no endpoints returned', async () => {
    mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText('No models found')).toBeInTheDocument());
  });

  it('filters models by search query', async () => {
    const { container, getByTestId, queryByTestId } = await renderPopulatedPage();
    const allCards = countCards(container);

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'Jina Reranker v2' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));
    expect(queryByTestId('eisModelCard-Jina Reranker v2')).toBeInTheDocument();
  });

  it('renders the model type filter and removes the old task type buttons', async () => {
    const { getByTestId, queryByTestId } = await renderPopulatedPage();
    expect(getByTestId('modelTypeFilterMultiselect')).toBeInTheDocument();
    expect(queryByTestId('eisTaskTypeFilter-LLM')).not.toBeInTheDocument();
    expect(queryByTestId('eisTaskTypeFilter-Embedding')).not.toBeInTheDocument();
    expect(queryByTestId('eisTaskTypeFilter-Rerank')).not.toBeInTheDocument();
  });

  it('filters models by model type', async () => {
    const { container, getByTestId } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByTestId('modelTypeFilterMultiselect'));
    const list = await waitFor(() => getByTestId('modelTypeFilterMultiselect-list'));
    fireEvent.click(within(list).getByText('Rerank'));

    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));
    expect(countCards(container)).toBeGreaterThan(0);
  });

  it('clears the model type filter when the option is clicked again', async () => {
    const { container, getByTestId } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByTestId('modelTypeFilterMultiselect'));
    const list = await waitFor(() => getByTestId('modelTypeFilterMultiselect-list'));
    fireEvent.click(within(list).getByText('Rerank'));
    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));

    fireEvent.click(within(list).getByText('Rerank'));
    await waitFor(() => expect(countCards(container)).toBe(allCards));
  });

  it('shows "No models found" when filters match nothing', async () => {
    const { getByTestId, getByText } = await renderPopulatedPage();

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'nonexistent-model-xyz-999' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(getByText('No models found')).toBeInTheDocument());
  });

  it('renders the model family filter', async () => {
    const { getByTestId } = await renderPopulatedPage();
    expect(getByTestId('modelFamilyFilterMultiselect')).toBeInTheDocument();
  });

  it('filters models by region and clears the selection', async () => {
    mockUseEisModels.mockReturnValue({
      data: [
        {
          inference_id: '.us-model',
          task_type: 'chat_completion',
          service: 'elastic',
          service_settings: { model_id: 'us-model' },
          metadata: {
            heuristics: { status: 'ga' },
            display: { name: 'US Model', model_creator: 'Anthropic' },
            regions: [{ csp: 'aws', region: 'us-east-1', geo: 'us' }],
          },
        },
        {
          inference_id: '.eu-model',
          task_type: 'chat_completion',
          service: 'elastic',
          service_settings: { model_id: 'eu-model' },
          metadata: {
            heuristics: { status: 'ga' },
            display: { name: 'EU Model', model_creator: 'OpenRouter' },
            regions: [{ geo: 'eu' }],
          },
        },
      ],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() => expect(getByTestId('eisModelCard-US Model')).toBeInTheDocument());
    expect(getByTestId('regionFilterMultiselect')).toHaveTextContent('Region');

    fireEvent.click(getByTestId('regionFilterMultiselect'));
    fireEvent.click(await waitFor(() => getByTestId('regionFilterOption-geo-us')));
    await waitFor(() => expect(queryByTestId('eisModelCard-EU Model')).not.toBeInTheDocument());
    expect(getByTestId('eisModelCard-US Model')).toBeInTheDocument();

    fireEvent.click(getByTestId('regionFilterOption-geo-eu'));
    await waitFor(() => expect(getByTestId('eisModelCard-EU Model')).toBeInTheDocument());
    expect(getByTestId('eisModelCard-US Model')).toBeInTheDocument();

    fireEvent.click(getByTestId('regionFilterOption-geo-us'));
    fireEvent.click(getByTestId('regionFilterOption-geo-eu'));
    await waitFor(() => expect(getByTestId('eisModelCard-EU Model')).toBeInTheDocument());

    fireEvent.click(getByTestId('regionFilterOption-region-aws-us-east-1'));
    await waitFor(() => expect(queryByTestId('eisModelCard-EU Model')).not.toBeInTheDocument());
    expect(getByTestId('eisModelCard-US Model')).toBeInTheDocument();
  });

  it('filters models by provider via model family filter', async () => {
    const { container, getByTestId, getByText } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByTestId('modelFamilyFilterMultiselect'));
    fireEvent.click(await waitFor(() => getByTestId('modelFamilyFilterOption-Anthropic')));

    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));
    expect(countCards(container)).toBeGreaterThan(0);
    expect(getByText('Elastic')).toBeInTheDocument();
  });

  it('renders the table view when the view mode is switched', async () => {
    const { getAllByTestId, getByTestId, queryByTestId, queryByText } = await renderPopulatedPage();

    expect(queryByTestId('contentListFooter-pagination')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-table'));

    const table = await waitFor(() => getByTestId('content-list-table'));
    expect(table).toHaveTextContent('Model name');
    expect(table).toHaveTextContent('Type');
    expect(table).toHaveTextContent('Provider');
    expect(table).toHaveTextContent('Released');
    expect(table).toHaveTextContent('End of Life');
    expect(queryByText('Supported tasks')).not.toBeInTheDocument();
    expect(getByTestId('contentListFooter-pagination')).toBeInTheDocument();
    expect(queryByTestId(RESULTS_SUMMARY)).not.toBeInTheDocument();
    expect(queryByTestId(SORT_MENU_BUTTON)).not.toBeInTheDocument();

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'Jina Reranker v2' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(
        getAllByTestId('content-list-table-item-link').some(
          (link) => link.textContent === 'Jina Reranker v2'
        )
      ).toBe(true)
    );

    const typeCell = getAllByTestId('eisTableType').find((cell) => cell.textContent === 'Rerank');
    const providerCell = getAllByTestId('eisTableProvider').find(
      (cell) => cell.textContent === 'Jina'
    );
    const releasedCell = getAllByTestId('eisTableReleased').find((cell) =>
      cell.textContent?.includes('2024-06-25')
    );
    const endOfLifeCell = getAllByTestId('eisTableEndOfLife').find((cell) =>
      cell.textContent?.includes('--')
    );
    expect(typeCell).toBeDefined();
    expect(providerCell).toBeDefined();
    expect(releasedCell).toBeDefined();
    expect(endOfLifeCell).toBeDefined();

    const modelLink = getAllByTestId('content-list-table-item-link').find(
      (link) => link.textContent === 'Jina Reranker v2'
    );
    if (!modelLink) {
      throw new Error('Jina Reranker v2 link was not rendered');
    }
    fireEvent.click(modelLink);
    expect(getByTestId('modelDetailFlyout')).toBeInTheDocument();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-card'));
    await waitFor(() => expect(queryByTestId('content-list-table')).not.toBeInTheDocument());
    expect(queryByTestId('contentListFooter-pagination')).not.toBeInTheDocument();
  });

  it('renders a future end-of-life date in the table', async () => {
    const modelName = 'Visible EOL model';
    mockUseEisModels.mockReturnValue({
      data: [
        {
          inference_id: 'visible-eol',
          task_type: 'chat_completion',
          service: 'elastic',
          service_settings: { model_id: 'visible-eol-model' },
          metadata: {
            heuristics: {
              status: 'ga',
              release_date: '2024-01-01',
              end_of_life_date: '2027-12-01',
            },
            display: { name: modelName, model_creator: 'Elastic' },
          },
        },
      ] as EisInferenceEndpoint[],
      isLoading: false,
      isError: false,
    });
    const { getAllByTestId, getByTestId } = renderPage();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-table'));
    await waitFor(() =>
      expect(
        getAllByTestId('content-list-table-item-link').some(
          (link) => link.textContent === modelName
        )
      ).toBe(true)
    );

    const endOfLifeCell = getAllByTestId('eisTableEndOfLife').find((cell) =>
      cell.textContent?.includes('2027-12-01')
    );
    expect(endOfLifeCell).toBeDefined();
  });

  it('shows the next page of models when paging the table', async () => {
    const pagedEndpoints = Array.from({ length: 26 }, (_, index) => {
      const name = `Paged model ${String(index + 1).padStart(2, '0')}`;
      return {
        inference_id: `paged-${name}`,
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: { model_id: name },
        metadata: { display: { name, model_creator: 'Elastic' } },
      } as EisInferenceEndpoint;
    });
    mockUseEisModels.mockReturnValue({ data: pagedEndpoints, isLoading: false, isError: false });
    const { getAllByTestId, getByTestId } = renderPage();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-table'));
    await waitFor(() => expect(getAllByTestId('content-list-table-item-link')).toHaveLength(25));

    const firstPageNames = getAllByTestId('content-list-table-item-link').map(
      (link) => link.textContent
    );
    expect(firstPageNames).not.toContain('Paged model 26');

    fireEvent.click(getByTestId('pagination-button-next'));
    await waitFor(() =>
      expect(
        getAllByTestId('content-list-table-item-link').some(
          (link) => link.textContent === 'Paged model 26'
        )
      ).toBe(true)
    );
    expect(
      getAllByTestId('content-list-table-item-link').some(
        (link) => link.textContent === 'Paged model 01'
      )
    ).toBe(false);
  });

  it('opens model detail flyout when clicking a card with valid model_id', async () => {
    const { getByTestId, queryByTestId } = await renderPopulatedPage();

    fireEvent.click(getByTestId('eisModelCard-Jina Reranker v2'));

    expect(queryByTestId('modelDetailFlyout')).toBeInTheDocument();
  });

  describe('read-only mode (manage: false)', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue(mockKibanaReturn({ manage: false }));
    });

    it('does not render the Add endpoint button inside the model detail flyout', async () => {
      const { getByTestId, queryByTestId } = await renderPopulatedPage();

      fireEvent.click(getByTestId('eisModelCard-Jina Reranker v2'));

      expect(queryByTestId('modelDetailFlyout')).toBeInTheDocument();
      expect(queryByTestId('modelDetailFlyoutAddEndpointButton')).not.toBeInTheDocument();
    });
  });

  it('does not open model detail flyout for an empty model_id in either view', async () => {
    const endpointWithoutModelId: EisInferenceEndpoint = {
      inference_id: 'no-model-id-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: '' },
    };
    mockUseEisModels.mockReturnValue({
      data: [endpointWithoutModelId],
      isLoading: false,
      isError: false,
    });
    const { container, getByTestId, getByText, queryByTestId } = renderPage();
    await waitFor(() => expect(countCards(container)).toBe(1));

    fireEvent.click(getByTestId('eisModelCard-no-model-id-endpoint'));
    expect(queryByTestId('modelDetailFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-table'));
    await waitFor(() => expect(getByTestId('content-list-table')).toBeInTheDocument());
    fireEvent.click(getByText('no-model-id-endpoint'));

    expect(queryByTestId('modelDetailFlyout')).not.toBeInTheDocument();
  });

  it('renders display options in the toolbar', async () => {
    const { getByTestId } = await renderPopulatedPage();
    expect(getByTestId('eisDisplayOptionsButton')).toBeInTheDocument();
  });

  it('hides preview models until Show is applied', async () => {
    const gaEndpoint: EisInferenceEndpoint = {
      inference_id: 'ga-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'ga-model' },
      metadata: {
        heuristics: { status: 'ga' },
        display: { name: 'GA Model', model_creator: 'Elastic' },
      },
    };
    const previewEndpoint: EisInferenceEndpoint = {
      inference_id: 'preview-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'preview-model' },
      metadata: {
        heuristics: { status: 'preview' },
        display: { name: 'Preview Model', model_creator: 'Elastic' },
      },
    };
    mockUseEisModels.mockReturnValue({
      data: [gaEndpoint, previewEndpoint],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() => expect(getByTestId('eisModelCard-GA Model')).toBeInTheDocument());
    expect(queryByTestId('eisModelCard-Preview Model')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));
    fireEvent.click(getByTestId('eisDisplayOptionsPreviewModelsShow'));
    fireEvent.click(getByTestId('eisDisplayOptionsApplyButton'));

    await waitFor(() => expect(getByTestId('eisModelCard-Preview Model')).toBeInTheDocument());
  });

  it('keeps search working after display options are applied', async () => {
    const gaEndpoint: EisInferenceEndpoint = {
      inference_id: 'ga-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'ga-model' },
      metadata: {
        heuristics: { status: 'ga' },
        display: { name: 'GA Model', model_creator: 'Elastic' },
      },
    };
    const previewEndpoint: EisInferenceEndpoint = {
      inference_id: 'preview-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'preview-model' },
      metadata: {
        heuristics: { status: 'preview' },
        display: { name: 'Preview Model', model_creator: 'Elastic' },
      },
    };
    mockUseEisModels.mockReturnValue({
      data: [gaEndpoint, previewEndpoint],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() => expect(getByTestId('eisModelCard-GA Model')).toBeInTheDocument());

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));
    fireEvent.click(getByTestId('eisDisplayOptionsPreviewModelsShow'));
    fireEvent.click(getByTestId('eisDisplayOptionsApplyButton'));
    await waitFor(() => expect(getByTestId('eisModelCard-Preview Model')).toBeInTheDocument());

    const searchBox = getByTestId(SEARCH_BOX);
    fireEvent.change(searchBox, { target: { value: 'Preview Model' } });
    fireEvent.keyUp(searchBox, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(queryByTestId('eisModelCard-GA Model')).not.toBeInTheDocument());
    expect(getByTestId('eisModelCard-Preview Model')).toBeInTheDocument();
  });

  it('does not open the display options tour when no models are region-blocked', async () => {
    const { queryByTestId } = await renderPopulatedPage();
    expect(queryByTestId('eisDisplayOptionsTourCloseButton')).not.toBeInTheDocument();
  });

  it('dismisses the display options tour from Close', async () => {
    const blockedEndpoint: EisInferenceEndpoint = {
      inference_id: 'blocked-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'blocked-model' },
      metadata: {
        heuristics: { status: 'ga' },
        display: { name: 'Blocked Model', model_creator: 'Elastic' },
        denied_by_region_policy: true,
      },
    };
    mockUseEisModels.mockReturnValue({
      data: [blockedEndpoint],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() =>
      expect(getByTestId('eisDisplayOptionsTourCloseButton')).toBeInTheDocument()
    );

    fireEvent.click(getByTestId('eisDisplayOptionsTourCloseButton'));

    expect(window.localStorage.getItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY)).toBe('true');
    await waitFor(() => {
      expect(queryByTestId('eisDisplayOptionsTourCloseButton')).not.toBeInTheDocument();
    });
  });

  it('does not open the display options tour when tours are disabled', async () => {
    mockUseKibana.mockReturnValue(mockKibanaReturn({ toursEnabled: false }));
    const blockedEndpoint: EisInferenceEndpoint = {
      inference_id: 'blocked-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'blocked-model' },
      metadata: {
        heuristics: { status: 'ga' },
        display: { name: 'Blocked Model', model_creator: 'Elastic' },
        denied_by_region_policy: true,
      },
    };
    mockUseEisModels.mockReturnValue({
      data: [blockedEndpoint],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() => expect(getByTestId('eisDisplayOptionsButton')).toBeInTheDocument());
    expect(queryByTestId('eisDisplayOptionsTourCloseButton')).not.toBeInTheDocument();
  });

  it('hides the display options tour without dismissing it when Display options is opened', async () => {
    const blockedEndpoint: EisInferenceEndpoint = {
      inference_id: 'blocked-endpoint',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'blocked-model' },
      metadata: {
        heuristics: { status: 'ga' },
        display: { name: 'Blocked Model', model_creator: 'Elastic' },
        denied_by_region_policy: true,
      },
    };
    mockUseEisModels.mockReturnValue({
      data: [blockedEndpoint],
      isLoading: false,
      isError: false,
    });
    const { getByTestId, queryByTestId } = renderPage();
    await waitFor(() =>
      expect(getByTestId('eisDisplayOptionsTourCloseButton')).toBeInTheDocument()
    );

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));

    await waitFor(() => {
      expect(queryByTestId('eisDisplayOptionsTourCloseButton')).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY)).toBeNull();
  });
});
