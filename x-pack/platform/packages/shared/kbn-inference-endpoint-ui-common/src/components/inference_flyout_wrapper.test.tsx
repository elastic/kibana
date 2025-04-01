/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

import { InferenceFlyoutWrapper } from './inference_flyout_wrapper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockProviders } from '../utils/mock_providers';

const mockMutationFn = jest.fn();
const httpMock = httpServiceMock.createStartContract();
const notificationsMock = notificationServiceMock.createStartContract();

jest.mock('../hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    data: mockProviders,
  })),
}));

jest.mock('../hooks/use_inference_endpoint_mutation', () => ({
  useInferenceEndpointMutation: jest.fn(() => ({
    mutate: mockMutationFn,
  })),
}));

describe('InferenceFlyout', () => {
  const Wrapper = ({ children }: { children: React.ReactElement }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nProvider>
    );
  };

  const renderComponent = (props = {}) => {
    return render(
      <Wrapper>
        <InferenceFlyoutWrapper
          onFlyoutClose={jest.fn()}
          http={httpMock}
          toasts={notificationsMock.toasts}
          isEdit={false}
          onSubmitSuccess={jest.fn()}
          {...props}
        />
      </Wrapper>
    );
  };
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    renderComponent();
    expect(screen.getByTestId('inference-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('inference-flyout-close-button')).toBeInTheDocument();
  });

  it('invalidates form if no provider is selected', async () => {
    renderComponent();
    await userEvent.click(screen.getByTestId('inference-endpoint-submit-button'));
    expect(screen.getByText('Provider is required.')).toBeInTheDocument();
    expect(mockMutationFn).not.toHaveBeenCalled();
    expect(screen.getByTestId('inference-endpoint-submit-button')).toBeDisabled();
  });

  it('submits form with correct data', async () => {
    renderComponent();
    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Elasticsearch'));
    await userEvent.click(screen.getByTestId('inference-endpoint-submit-button'));

    expect(mockMutationFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          provider: 'elasticsearch',
        }),
      }),
      false
    );
  });

  // skipping this test for now until we figure out why its failing in CI only
  it.skip('handles edit mode correctly', async () => {
    const mockEndpoint = {
      config: {
        inferenceId: 'test-id',
        provider: 'hugging_face',
        taskType: 'text_embedding',
        providerConfig: {
          model_id: 'temp-test-model',
        },
      },
      secrets: {
        providerSecrets: {
          api_key: '',
        },
      },
    };

    renderComponent({ isEdit: true, inferenceEndpoint: mockEndpoint });
    expect(screen.getByTestId('provider-select')).toHaveValue('Hugging Face');

    await waitFor(async () => {
      await userEvent.type(screen.getByTestId('api_key-password'), '12345');
    });

    await waitFor(async () => {
      await userEvent.type(screen.getByTestId('url-input'), 'http://sameurl.com/chat/embeddings');
    });

    await waitFor(async () => {
      await userEvent.click(screen.getByTestId('inference-endpoint-submit-button'));
    });

    await waitFor(() => {
      expect(mockMutationFn).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            inferenceId: 'test-id',
            provider: 'hugging_face',
            providerConfig: {
              model_id: 'temp-test-model',
              url: 'https://api.openai.com/v1/embeddingshttp://sameurl.com/chat/embeddings',
            },
            taskType: 'text_embedding',
          },
          secrets: { providerSecrets: { api_key: '12345' } },
        }),
        true
      );
    });
  }, 10000);

  it('disables submit button for preconfigured endpoints', () => {
    const mockEndpoint = {
      config: {
        inferenceId: '.test-id',
        provider: 'elasticsearch',
        taskType: 'text_embedding',
        providerConfig: {},
      },
      secrets: {
        providerSecrets: {},
      },
    };

    renderComponent({ isEdit: true, inferenceEndpoint: mockEndpoint });
    expect(screen.getByTestId('inference-endpoint-submit-button')).toBeDisabled();
  });

  it('disables the num_allocations field for preconfigured endpoints', () => {
    const mockEndpoint = {
      config: {
        inferenceId: '.test-id',
        provider: 'elasticsearch',
        taskType: 'text_embedding',
        providerConfig: {},
      },
      secrets: {
        providerSecrets: {},
      },
    };

    renderComponent({ isEdit: true, inferenceEndpoint: mockEndpoint });
    expect(screen.getByTestId('num_allocations-number')).toBeDisabled();
  });

  it('the num_allocations field is enabled for other endpoints', () => {
    const mockEndpoint = {
      config: {
        inferenceId: 'test-id',
        provider: 'elasticsearch',
        taskType: 'text_embedding',
        providerConfig: {},
      },
      secrets: {
        providerSecrets: {},
      },
    };

    renderComponent({ isEdit: true, inferenceEndpoint: mockEndpoint });
    expect(screen.getByTestId('num_allocations-number')).toBeEnabled();
  });
});
