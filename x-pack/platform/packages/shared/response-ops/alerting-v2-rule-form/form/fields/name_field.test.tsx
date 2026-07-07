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
import {
  createFormWrapper,
  createTestQueryClient,
  createMockServices,
  defaultTestFormValues,
} from '../../test_utils';
import type { FormValues } from '../types';
import { RuleFormProvider } from '../contexts';

describe('NameField', () => {
  it('renders with a Name label', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renders a text input with placeholder', () => {
    render(<NameField />, { wrapper: createFormWrapper() });

    const input = screen.getByTestId('ruleNameInput');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Untitled rule');
  });

  it('displays initial value from form context', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'My Test Rule',
        enabled: true,
      },
    });

    render(<NameField />, { wrapper: Wrapper });

    expect(screen.getByTestId('ruleNameInput')).toHaveValue('My Test Rule');
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: defaultTestFormValues,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
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

  it('shows error when submitted with the default placeholder name', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          metadata: { ...defaultTestFormValues.metadata, name: 'Untitled rule' },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
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
