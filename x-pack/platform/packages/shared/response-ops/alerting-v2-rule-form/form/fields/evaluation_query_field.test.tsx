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
import type { AggregateQuery } from '@kbn/es-query';
import { EvaluationQueryField } from './evaluation_query_field';
import { createFormWrapper, createTestQueryClient, defaultTestFormValues } from '../../test_utils';
import type { FormValues } from '../types';

// Mock the ESQLLangEditor component from @kbn/esql/public
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    dataTestSubj,
    errors,
  }: {
    query: AggregateQuery;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    dataTestSubj?: string;
    errors?: Error[];
  }) => (
    <div data-test-subj={dataTestSubj}>
      <textarea
        data-test-subj={`${dataTestSubj}-input`}
        value={query.esql}
        onChange={(e) => onTextLangQueryChange({ esql: e.target.value })}
      />
      {errors?.map((error, i) => (
        <div key={i} data-test-subj={`${dataTestSubj}-error`}>
          {error.message}
        </div>
      ))}
    </div>
  ),
}));

// Mock validateEsqlQuery from @kbn/alerting-v2-schemas
jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: jest.fn((query: string) => {
    // Simulate ES|QL validation (sync)
    if (!query || query.trim() === '') {
      return undefined; // valid (empty handled by required)
    }
    if (!query.toUpperCase().startsWith('FROM')) {
      return 'Invalid ES|QL query: Query must start with FROM';
    }
    // Check for invalid syntax like "FROM |"
    if (query.includes('|') && query.split('|')[1]?.trim() === '') {
      return 'Invalid ES|QL query: Expected command after pipe';
    }
    return undefined; // valid
  }),
}));

describe('EvaluationQueryField', () => {
  it('renders the editor with data-test-subj attribute', () => {
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toBeInTheDocument();
  });

  it('displays initial value from form context', () => {
    render(<EvaluationQueryField />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-* | STATS count = COUNT(*)' } },
      }),
    });

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField-editor-input')).toHaveValue(
      'FROM logs-* | STATS count = COUNT(*)'
    );
  });

  it('updates value when user types', async () => {
    const user = userEvent.setup();
    render(<EvaluationQueryField />, { wrapper: createFormWrapper() });

    const textarea = screen.getByTestId('ruleV2FormEvaluationQueryField-editor-input');
    await user.clear(textarea);
    await user.type(textarea, 'FROM metrics-*');

    expect(textarea).toHaveValue('FROM metrics-*');
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
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
      // Error appears in both EuiFormRow and the editor's error display
      const errors = screen.getAllByText('ES|QL query is required.');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for invalid ES|QL query syntax', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
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
      // Error appears in both EuiFormRow and the editor's error display
      const errors = screen.getAllByText('Invalid ES|QL query: Query must start with FROM');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for incomplete query', async () => {
    const queryClient = createTestQueryClient();

    const WrapperWithSubmit = ({ children }: { children: React.ReactNode }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          evaluation: { query: { base: 'FROM logs-* |' } },
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
      // Error appears in both EuiFormRow and the editor's error display
      const errors = screen.getAllByText('Invalid ES|QL query: Expected command after pipe');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('accepts custom height prop', () => {
    render(<EvaluationQueryField height={200} />, { wrapper: createFormWrapper() });

    // The component renders - height is passed to EsqlEditorField
    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toBeInTheDocument();
  });
});
