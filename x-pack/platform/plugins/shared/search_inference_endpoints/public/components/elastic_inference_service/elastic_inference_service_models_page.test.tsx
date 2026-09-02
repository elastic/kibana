/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { ElasticInferenceServiceModelsPage } from './elastic_inference_service_models_page';
import type { EisInferenceEndpoint } from '../../../common/types';
import { useEisModels } from '../../hooks/use_eis_models';
import { InferenceEndpoints } from '../../__mocks__/inference_endpoints';

jest.mock('../../hooks/use_eis_models');
jest.mock('../../hooks/use_kibana');

const { useKibana } = jest.requireMock('../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;

const mockKibanaReturn = ({ manage = true }: { manage?: boolean } = {}) => ({
  services: {
    notifications: { toasts: { addSuccess: jest.fn(), addDanger: jest.fn() } },
    application: {
      capabilities: { searchInferenceEndpoints: { show: true, manage } },
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

const countCards = (container: HTMLElement) =>
  container.querySelectorAll('[data-test-subj^="eisModelCard-"]').length;

// The page mounts under the app's `Router`, which is what enables the Content
// List's URL sync — omitting it here hid a filtering regression from jest.
const renderPage = () =>
  render(
    <Router history={createMemoryHistory()}>
      <ElasticInferenceServiceModelsPage />
    </Router>
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
  });

  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = renderPage();
    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('renders an error prompt when fetching fails', () => {
    mockUseEisModels.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { getByText } = renderPage();
    expect(getByText('Unable to load models')).toBeInTheDocument();
  });

  it('renders model cards when data is loaded', async () => {
    const { container } = await renderPopulatedPage();
    expect(countCards(container)).toBeGreaterThan(0);
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

  it('filters models by task type toggle buttons', async () => {
    const { container, getByTestId } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByTestId('eisTaskTypeFilter-Rerank'));

    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));
    expect(countCards(container)).toBeGreaterThan(0);
  });

  it('toggles task type filter off when clicked again', async () => {
    const { container, getByTestId } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByTestId('eisTaskTypeFilter-Rerank'));
    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));

    fireEvent.click(getByTestId('eisTaskTypeFilter-Rerank'));
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

  it('filters models by provider via model family filter', async () => {
    const { container, getByText } = await renderPopulatedPage();
    const allCards = countCards(container);

    fireEvent.click(getByText('Model provider'));
    await waitFor(() => expect(getByText('Anthropic')).toBeInTheDocument());

    fireEvent.click(getByText('Anthropic'));

    await waitFor(() => expect(countCards(container)).toBeLessThan(allCards));
    expect(countCards(container)).toBeGreaterThan(0);
    expect(getByText('Elastic')).toBeInTheDocument();
  });

  it('renders the table view when the view mode is switched', async () => {
    const { getByTestId, getByText, queryByText } = await renderPopulatedPage();

    fireEvent.click(getByTestId('eisModelsViewModeSelector-table'));

    await waitFor(() => expect(getByTestId('content-list-table')).toBeInTheDocument());
    expect(getByText('Model')).toBeInTheDocument();
    expect(getByText('Provider')).toBeInTheDocument();
    expect(getByText('Type')).toBeInTheDocument();
    expect(queryByText('Supported tasks')).not.toBeInTheDocument();

    fireEvent.click(getByText('Jina Reranker v2'));
    expect(getByTestId('modelDetailFlyout')).toBeInTheDocument();
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
});
