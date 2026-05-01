/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ElasticInferenceServiceModelsPage } from './elastic_inference_service_models_page';
import { useEisModels } from '../../hooks/use_eis_models';
import { InferenceEndpoints } from '../../__mocks__/inference_endpoints';
import type { EisInferenceEndpoint } from '../../utils/eis_utils';

jest.mock('../../hooks/use_eis_models');
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addSuccess: jest.fn(), addDanger: jest.fn() } },
    },
  }),
}));
jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockUseEisModels = useEisModels as jest.Mock;

const endpoints = InferenceEndpoints.filter((ep) => ep.service === 'elastic');

describe('ElasticInferenceServiceModelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<ElasticInferenceServiceModelsPage />);
    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('renders an error prompt when fetching fails', () => {
    mockUseEisModels.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { getByText } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByText('Unable to load models')).toBeInTheDocument();
  });

  it('renders model cards when data is loaded', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { container } = render(<ElasticInferenceServiceModelsPage />);
    const cards = container.querySelectorAll('[data-test-subj^="eisModelCard-"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders empty state when no endpoints returned', () => {
    mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { getByText } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByText('No models found')).toBeInTheDocument();
  });

  it('filters models by search query', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByLabelText, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    const searchInput = getByLabelText('Find Elastic Inference Service models');
    fireEvent.change(searchInput, { target: { value: 'Jina Reranker v2' } });

    expect(queryByTestId('eisModelCard-Jina Reranker v2')).toBeInTheDocument();
  });

  it('filters models by task type toggle buttons', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByRole, container } = render(<ElasticInferenceServiceModelsPage />);

    const rerankButton = getByRole('button', { name: 'Rerank' });
    fireEvent.click(rerankButton);

    const cards = container.querySelectorAll('[data-test-subj^="eisModelCard-"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('toggles task type filter off when clicked again', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByRole, container } = render(<ElasticInferenceServiceModelsPage />);

    const rerankButton = getByRole('button', { name: 'Rerank' });
    fireEvent.click(rerankButton);
    const cardsFiltered = container.querySelectorAll('[data-test-subj^="eisModelCard-"]').length;

    fireEvent.click(rerankButton);
    const cardsAll = container.querySelectorAll('[data-test-subj^="eisModelCard-"]').length;

    expect(cardsAll).toBeGreaterThan(cardsFiltered);
  });

  it('shows "No models found" when filters match nothing', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByLabelText, getByText } = render(<ElasticInferenceServiceModelsPage />);

    const searchInput = getByLabelText('Find Elastic Inference Service models');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-model-xyz-999' } });

    expect(getByText('No models found')).toBeInTheDocument();
  });

  it('renders the model family filter', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByTestId } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByTestId('modelFamilyFilterMultiselect')).toBeInTheDocument();
  });

  it('filters models by provider via model family filter', async () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByText, container } = render(<ElasticInferenceServiceModelsPage />);

    fireEvent.click(getByText('Model family'));

    await waitFor(() => {
      expect(getByText('Anthropic')).toBeInTheDocument();
    });

    fireEvent.click(getByText('Anthropic'));

    await waitFor(() => {
      const cards = container.querySelectorAll('[data-test-subj^="eisModelCard-"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('opens model detail flyout when clicking a card with valid model_id', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByTestId, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    fireEvent.click(getByTestId('eisModelCard-Jina Reranker v2'));

    expect(queryByTestId('modelDetailFlyout')).toBeInTheDocument();
  });

  it('does not open model detail flyout when endpoint has empty model_id', () => {
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
    const { getByTestId, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    fireEvent.click(getByTestId('eisModelCard-no-model-id-endpoint'));

    expect(queryByTestId('modelDetailFlyout')).not.toBeInTheDocument();
  });
});
