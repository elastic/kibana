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

import { AddInferenceFlyoutWrapper } from './add_inference_flyout_wrapper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAddEndpoint = jest.fn();
const mockResendRequest = jest.fn();
const mockOnClose = jest.fn();

jest.mock('../../../../../../hooks/use_add_endpoint', () => ({
  useAddEndpoint: () => ({
    addInferenceEndpoint: mockAddEndpoint.mockImplementation(() => Promise.resolve()),
  }),
}));

jest.mock('../../../../../../app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    core: {
      http: jest.fn(),
    },
    services: {
      notificationService: {
        toasts: jest.fn(),
      },
    },
  }),
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

describe('AddInferenceFlyout', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await act(async () => {
      render(
        <MockFormProvider>
          <AddInferenceFlyoutWrapper
            onFlyoutClose={mockOnClose}
            resendRequest={mockResendRequest}
          />
        </MockFormProvider>
      );
    });
  });

  it('renders', async () => {
    expect(screen.getByTestId('create-inference-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-close-button')).toBeInTheDocument();
  });

  it('invalidates form if no provider is selected', async () => {
    await userEvent.click(screen.getByTestId('add-inference-endpoint-submit-button'));
    expect(screen.getByText('Provider is required.')).toBeInTheDocument();
    expect(mockAddEndpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-inference-endpoint-submit-button')).toBeDisabled();
  });

  it('closes flyout', async () => {
    await userEvent.click(screen.getByTestId('create-inference-flyout-close-button'));
    expect(mockOnClose).toBeCalled();
  });
});
