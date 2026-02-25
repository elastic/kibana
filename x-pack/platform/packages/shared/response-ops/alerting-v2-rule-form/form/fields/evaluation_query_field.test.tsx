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
import { EvaluationQueryField } from './evaluation_query_field';
import { createFormWrapper, createTestQueryClient, defaultTestFormValues } from '../../test_utils';
import type { FormValues } from '../types';

// Mock the CodeEditorField component
jest.mock('@kbn/code-editor', () => ({
  CodeEditorField: ({
    value,
    onChange,
    placeholder,
    dataTestSubj,
    'aria-label': ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    dataTestSubj?: string;
    'aria-label'?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  ),
}));

// Mock validateEsqlQuery
jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: jest.fn((query: string) => {
    if (!query || query.trim() === '') {
      return 'Query is required';
    }
    if (!query.toUpperCase().startsWith('FROM')) {
      return 'Query must start with FROM';
    }
    return null;
  }),
}));

describe('EvaluationQueryField', () => {
  it('renders the editor with accessible aria-label', () => {
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    expect(screen.getByLabelText('ES|QL query editor')).toBeInTheDocument();
  });

  it('renders the data-test-subj attribute', () => {
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toHaveAttribute(
      'placeholder',
      'FROM logs-* | WHERE ...'
    );
  });

  it('displays initial value from form context', () => {
    render(<EvaluationQueryField />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-* | STATS count = COUNT(*)' } },
      }),
    });

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toHaveValue(
      'FROM logs-* | STATS count = COUNT(*)'
    );
  });

  it('updates value when user types', async () => {
    const user = userEvent.setup();
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    const textarea = screen.getByTestId('ruleV2FormEvaluationQueryField');
    await user.clear(textarea);
    await user.type(textarea, 'FROM metrics-*');

    expect(textarea).toHaveValue('FROM metrics-*');
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          evaluation: { query: { base: '' } },
        },
        mode: 'onSubmit',
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
    render(<EvaluationQueryField />, { wrapper: WrapperWithSubmit });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ES|QL query is required.')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid ES|QL query', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          evaluation: { query: { base: 'INVALID QUERY' } },
        },
        mode: 'onSubmit',
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
    render(<EvaluationQueryField />, { wrapper: WrapperWithSubmit });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Query must start with FROM')).toBeInTheDocument();
    });
  });

  it('accepts custom height prop', () => {
    render(<EvaluationQueryField height={200} />, { wrapper: createFormWrapper() });

    // The component renders - height is passed to CodeEditorField
    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toBeInTheDocument();
  });
});
