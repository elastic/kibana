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
  it('renders the name label', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders a text input', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays initial value from form context', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'My Test Rule',
        enabled: true,
      },
    });

    render(<NameField />, { wrapper: Wrapper });

    expect(screen.getByRole('textbox')).toHaveValue('My Test Rule');
  });

  it('updates value when user types', async () => {
    const user = userEvent.setup();
    render(<NameField />, { wrapper: createFormWrapper() });

    const input = screen.getByRole('textbox');
    await user.type(input, 'New Rule Name');

    expect(input).toHaveValue('New Rule Name');
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
