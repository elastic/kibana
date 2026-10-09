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
import { DescriptionField } from './description_field';
import {
  createFormWrapper,
  createMockServices,
  createTestQueryClient,
  defaultTestFormValues,
} from '../../test_utils';
import type { FormValues } from '../types';
import { RuleFormProvider } from '../contexts';

describe('DescriptionField', () => {
  it('renders the description textarea immediately without any interaction', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('displays textarea directly when initial description value exists', () => {
    const Wrapper = createFormWrapper({
      metadata: {
        name: 'Test Rule',
        enabled: true,
        description: 'Initial description',
      },
    });

    render(<DescriptionField />, { wrapper: Wrapper });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDescriptionInput')).toHaveValue('Initial description');
  });

  it('displays placeholder text in textarea', () => {
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    expect(
      screen.getByPlaceholderText('Add an optional description for this rule...')
    ).toBeInTheDocument();
  });

  it('updates value when user types in textarea', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    const textarea = screen.getByTestId('ruleDescriptionInput');
    await user.type(textarea, 'My new description');

    expect(textarea).toHaveValue('My new description');
  });

  it('renders correctly in flyout layout', () => {
    render(<DescriptionField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
  });

  it('keeps textarea visible after clearing the value', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: createFormWrapper() });

    const textarea = screen.getByTestId('ruleDescriptionInput');
    await user.type(textarea, 'test');
    await user.clear(textarea);

    // Textarea should still be visible even though value is cleared
    expect(screen.getByTestId('ruleDescriptionInput')).toBeInTheDocument();
  });

  it('shows error when submitted with a description longer than 1024 characters', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          metadata: { ...defaultTestFormValues.metadata, description: 'a'.repeat(1025) },
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
    render(<DescriptionField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Description cannot exceed 1024 characters.')).toBeInTheDocument();
    });
  });

  it('does not show a length error when submitted with a description of exactly 1024 characters', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();
    const onSubmit = jest.fn();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          metadata: { ...defaultTestFormValues.metadata, description: 'a'.repeat(1024) },
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
            <button type="button" onClick={form.handleSubmit(onSubmit)}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(
      screen.queryByText('Description cannot exceed 1024 characters.')
    ).not.toBeInTheDocument();
  });

  it('does not show a length error when the description is empty', async () => {
    const onSubmit = jest.fn();
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({ defaultValues: defaultTestFormValues });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'page' }}>
              {children}
            </RuleFormProvider>
            <button type="button" onClick={form.handleSubmit(onSubmit)}>
              Submit
            </button>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<DescriptionField />, { wrapper: WrapperWithSubmit });

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
