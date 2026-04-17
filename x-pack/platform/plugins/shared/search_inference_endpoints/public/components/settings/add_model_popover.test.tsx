/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AddModelPopover } from './add_model_popover';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';

jest.mock('../../hooks/use_inference_endpoints');

const mockUseQueryInferenceEndpoints = useQueryInferenceEndpoints as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <EuiThemeProvider>
        <I18nProvider>{children}</I18nProvider>
      </EuiThemeProvider>
    </QueryClientProvider>
  );
};

const mockEndpoints = [
  {
    inference_id: 'ep-1',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o' },
  },
  {
    inference_id: 'ep-2',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o-mini' },
  },
  {
    inference_id: 'ep-eis',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'claude-sonnet' },
    metadata: {
      display: {
        name: 'Claude Sonnet',
        model_creator: 'Anthropic',
      },
    },
  },
  {
    inference_id: 'ep-eis-no-meta',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'some-model' },
  },
  {
    inference_id: 'ep-embed',
    service: 'elastic',
    task_type: 'text_embedding',
    service_settings: { model_id: 'e5' },
  },
];

describe('AddModelPopover', () => {
  const onAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryInferenceEndpoints.mockReturnValue({ data: mockEndpoints });
  });

  it('renders the add model button', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
  });

  it('opens popover on button click', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByTestId('add-model-search')).toBeInTheDocument();
  });

  it('excludes existing endpoint IDs from the list', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={['ep-1']} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('filters by task type when provided', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} taskType="text_embedding" />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
  });

  it('uses display name for EIS endpoints with metadata', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('Claude Sonnet')).toBeInTheDocument();
  });

  it('falls back to model_id for EIS endpoints without display metadata', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('some-model')).toBeInTheDocument();
  });

  it('calls onAdd with the selected endpoint inference_id', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));
    fireEvent.click(screen.getByText('gpt-4o-mini'));

    expect(onAdd).toHaveBeenCalledWith('ep-2');
  });

  it('shows disambiguation suffix when multiple endpoints share a model name', () => {
    const duplicateEndpoints = [
      {
        inference_id: 'ep-a',
        service: 'openai',
        task_type: 'chat_completion',
        service_settings: { model_id: 'gpt-4o' },
      },
      {
        inference_id: 'ep-b',
        service: 'openai',
        task_type: 'chat_completion',
        service_settings: { model_id: 'gpt-4o' },
      },
    ];
    mockUseQueryInferenceEndpoints.mockReturnValue({ data: duplicateEndpoints });

    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('gpt-4o (ep-a)')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o (ep-b)')).toBeInTheDocument();
  });
});
