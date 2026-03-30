/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { NameField } from './name_field';
import { createFormWrapper, createTestQueryClient, defaultTestFormValues } from '../../test_utils';
import type { FormValues } from '../types';

describe('NameField', () => {
  it('renders the default name text when no name is provided', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Untitled rule')).toBeInTheDocument();
  });

  it('renders as an inline editable title', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleNameInlineEdit')).toBeInTheDocument();
  });

  it('renders the inline edit read mode button with pencil icon', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    // EuiInlineEditTitle renders a button to activate edit mode
    expect(screen.getByTestId('euiInlineReadModeButton')).toBeInTheDocument();
  });

  it('displays initial value from form context', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'My Test Rule',
        enabled: true,
      },
    });

    render(<NameField />, { wrapper: Wrapper });

    expect(screen.getByText('My Test Rule')).toBeInTheDocument();
  });

  it('enters edit mode when read mode button is clicked', async () => {
    const user = userEvent.setup();
    render(<NameField />, { wrapper: createFormWrapper() });

    // Click the inline edit read mode button to enter edit mode
    const readModeButton = screen.getByTestId('euiInlineReadModeButton');
    await user.click(readModeButton);

    // Now a text input should be visible in edit mode
    await waitFor(() => {
      expect(screen.getByLabelText('Edit rule name')).toBeInTheDocument();
    });
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: defaultTestFormValues,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            {children}
            <button type="button" onClick={form.handleSubmit(() => {})}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<NameField />, { wrapper: WrapperWithSubmit });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required.')).toBeInTheDocument();
    });
  });
});
