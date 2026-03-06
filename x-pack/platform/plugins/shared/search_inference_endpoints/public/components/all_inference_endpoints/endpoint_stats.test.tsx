/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EndpointStats } from './endpoint_stats';

const renderWithTheme = (component: React.ReactElement) =>
  render(<EuiThemeProvider>{component}</EuiThemeProvider>);

const mockEndpoints: InferenceInferenceEndpointInfo[] = [
  {
    inference_id: 'endpoint-1',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      model_id: '.elser_model_2',
    },
  },
  {
    inference_id: 'endpoint-2',
    task_type: 'text_embedding',
    service: 'elasticsearch',
    service_settings: {
      model_id: '.multilingual-e5-small',
    },
  },
  {
    inference_id: 'endpoint-3',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'rainbow-sprinkles',
    },
  },
  {
    inference_id: 'endpoint-4',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: {
      model_id: '.elser_model_2', // same model as endpoint-1
    },
  },
  {
    inference_id: 'endpoint-5',
    task_type: 'rerank',
    service: 'openai',
    service_settings: {
      model: 'gpt-4', // uses 'model' instead of 'model_id'
    },
  },
] as InferenceInferenceEndpointInfo[];

describe('EndpointStats', () => {
  it('renders the stats component with count selectors', () => {
    renderWithTheme(<EndpointStats endpoints={mockEndpoints} />);

    expect(screen.getByTestId('endpointStats')).toBeInTheDocument();
    expect(screen.getByTestId('endpointStatsServicesCount')).toBeInTheDocument();
    expect(screen.getByTestId('endpointStatsModelsCount')).toBeInTheDocument();
    expect(screen.getByTestId('endpointStatsTypesCount')).toBeInTheDocument();
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toBeInTheDocument();
  });

  it('displays correct counts for services, models, types, and endpoints', () => {
    renderWithTheme(<EndpointStats endpoints={mockEndpoints} />);

    // 3 unique services: elasticsearch, elastic, openai
    expect(screen.getByTestId('endpointStatsServicesCount')).toHaveTextContent('3');

    // 4 unique models: .elser_model_2, .multilingual-e5-small, rainbow-sprinkles, gpt-4
    expect(screen.getByTestId('endpointStatsModelsCount')).toHaveTextContent('4');

    // 4 unique types: sparse_embedding, text_embedding, chat_completion, rerank
    expect(screen.getByTestId('endpointStatsTypesCount')).toHaveTextContent('4');

    // 5 endpoints total
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toHaveTextContent('5');
  });

  it('displays zero counts when no endpoints are provided', () => {
    renderWithTheme(<EndpointStats endpoints={[]} />);

    expect(screen.getByTestId('endpointStatsServicesCount')).toHaveTextContent('0');
    expect(screen.getByTestId('endpointStatsModelsCount')).toHaveTextContent('0');
    expect(screen.getByTestId('endpointStatsTypesCount')).toHaveTextContent('0');
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toHaveTextContent('0');
  });

  it('handles endpoints without model_id correctly', () => {
    const endpointsWithoutModel: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: 'endpoint-no-model',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {},
      },
    ] as InferenceInferenceEndpointInfo[];

    renderWithTheme(<EndpointStats endpoints={endpointsWithoutModel} />);

    expect(screen.getByTestId('endpointStatsServicesCount')).toHaveTextContent('1');
    expect(screen.getByTestId('endpointStatsModelsCount')).toHaveTextContent('0');
    expect(screen.getByTestId('endpointStatsTypesCount')).toHaveTextContent('1');
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toHaveTextContent('1');
  });

  it('correctly counts duplicate services, models, and types', () => {
    const endpointsWithDuplicates: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: 'endpoint-1',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: { model_id: 'model-a' },
      },
      {
        inference_id: 'endpoint-2',
        task_type: 'text_embedding',
        service: 'elasticsearch', // duplicate service
        service_settings: { model_id: 'model-a' }, // duplicate model
      },
      {
        inference_id: 'endpoint-3',
        task_type: 'sparse_embedding', // duplicate type
        service: 'elasticsearch', // duplicate service
        service_settings: { model_id: 'model-b' }, // different model
      },
    ] as InferenceInferenceEndpointInfo[];

    renderWithTheme(<EndpointStats endpoints={endpointsWithDuplicates} />);

    // 1 unique service: elasticsearch
    expect(screen.getByTestId('endpointStatsServicesCount')).toHaveTextContent('1');

    // 2 unique models: model-a, model-b
    expect(screen.getByTestId('endpointStatsModelsCount')).toHaveTextContent('2');

    // 2 unique types: sparse_embedding, text_embedding
    expect(screen.getByTestId('endpointStatsTypesCount')).toHaveTextContent('2');

    // 3 endpoints total
    expect(screen.getByTestId('endpointStatsEndpointsCount')).toHaveTextContent('3');
  });
});
