/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

import { InferenceFlyoutWrapper } from './inference_flyout_wrapper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockProviders } from '../utils/mock_providers';

const mockAddEndpoint = jest.fn();
const mockOnSubmitSuccess = jest.fn();
const mockOnClose = jest.fn();
const httpMock = httpServiceMock.createStartContract();
const notificationsMock = notificationServiceMock.createStartContract();

jest.mock('../hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    data: mockProviders,
  })),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();
  const queryClient = new QueryClient();
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <Form form={form}>{children}</Form>
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('InferenceFlyout', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await act(async () => {
      render(
        <MockFormProvider>
          <InferenceFlyoutWrapper
            onFlyoutClose={mockOnClose}
            onSubmitSuccess={mockOnSubmitSuccess}
            isEdit={false}
            http={httpMock}
            toasts={notificationsMock.toasts}
            addInferenceEndpoint={mockAddEndpoint}
          />
        </MockFormProvider>
      );
    });
  });

  it('renders', async () => {
    expect(screen.getByTestId('inference-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('inference-flyout-close-button')).toBeInTheDocument();
  });

  it('invalidates form if no provider is selected', async () => {
    await userEvent.click(screen.getByTestId('inference-endpoint-submit-button'));
    expect(screen.getByText('Provider is required.')).toBeInTheDocument();
    expect(mockAddEndpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('inference-endpoint-submit-button')).toBeDisabled();
  });

  it('submit form', async () => {
    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Elasticsearch'));
    await userEvent.click(screen.getByTestId('inference-endpoint-submit-button'));

    expect(mockAddEndpoint).toHaveBeenCalled();
  });

  it('closes flyout', async () => {
    await userEvent.click(screen.getByTestId('inference-flyout-close-button'));
    expect(mockOnClose).toBeCalled();
  });
});
