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
import type { EisInferenceEndpoint } from '../../hooks/use_eis_models';

jest.mock('../../hooks/use_eis_models');
const mockUseEisModels = useEisModels as jest.Mock;

const endpoints: EisInferenceEndpoint[] = [
  {
    inferenceId: 'ep-embed-1',
    taskType: 'text_embedding',
    service: 'elastic',
    serviceSettings: { model_id: 'my-embedding-model' },
  },
  {
    inferenceId: 'ep-chat-1',
    taskType: 'chat_completion',
    service: 'elastic',
    serviceSettings: { model_id: 'my-embedding-model' },
  },
  {
    inferenceId: 'ep-rerank-1',
    taskType: 'rerank',
    service: 'openai',
    serviceSettings: { model_id: 'openai-reranker' },
  },
];

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
    const { getByTestId } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByTestId('eisModelCard-my-embedding-model')).toBeInTheDocument();
    expect(getByTestId('eisModelCard-openai-reranker')).toBeInTheDocument();
  });

  it('renders empty state when no endpoints returned', () => {
    mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { getByText } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByText('No models found')).toBeInTheDocument();
  });

  it('filters models by search query', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByLabelText, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    const searchInput = getByLabelText('Find Elastic Inference Service models by typing');
    fireEvent.change(searchInput, { target: { value: 'openai-reranker' } });

    expect(queryByTestId('eisModelCard-openai-reranker')).toBeInTheDocument();
    expect(queryByTestId('eisModelCard-my-embedding-model')).not.toBeInTheDocument();
  });

  it('filters models by task type toggle buttons', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByRole, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    const rerankButton = getByRole('button', { name: 'Rerank' });
    fireEvent.click(rerankButton);

    expect(queryByTestId('eisModelCard-openai-reranker')).toBeInTheDocument();
    expect(queryByTestId('eisModelCard-my-embedding-model')).not.toBeInTheDocument();
  });

  it('toggles task type filter off when clicked again', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByRole, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    const rerankButton = getByRole('button', { name: 'Rerank' });
    fireEvent.click(rerankButton);
    fireEvent.click(rerankButton);

    expect(queryByTestId('eisModelCard-openai-reranker')).toBeInTheDocument();
    expect(queryByTestId('eisModelCard-my-embedding-model')).toBeInTheDocument();
  });

  it('shows "No models found" when filters match nothing', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByLabelText, getByText } = render(<ElasticInferenceServiceModelsPage />);

    const searchInput = getByLabelText('Find Elastic Inference Service models by typing');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-model' } });

    expect(getByText('No models found')).toBeInTheDocument();
  });

  it('renders the model family filter', () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByTestId } = render(<ElasticInferenceServiceModelsPage />);
    expect(getByTestId('modelFamilyFilterMultiselect')).toBeInTheDocument();
  });

  it('filters models by provider via model family filter', async () => {
    mockUseEisModels.mockReturnValue({ data: endpoints, isLoading: false, isError: false });
    const { getByText, queryByTestId } = render(<ElasticInferenceServiceModelsPage />);

    fireEvent.click(getByText('Model family'));

    await waitFor(() => {
      expect(getByText('OpenAI')).toBeInTheDocument();
    });

    fireEvent.click(getByText('OpenAI'));

    await waitFor(() => {
      expect(queryByTestId('eisModelCard-openai-reranker')).toBeInTheDocument();
      expect(queryByTestId('eisModelCard-my-embedding-model')).not.toBeInTheDocument();
    });
  });
});
