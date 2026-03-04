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
import { RecoveryBaseQueryField } from './recovery_base_query_field';
import { createFormWrapper, createTestQueryClient, defaultTestFormValues } from '../../test_utils';
import { RuleFormServicesProvider } from '../contexts';
import { createMockServices } from '../../test_utils';
import type { FormValues } from '../types';

// Mock the ESQLLangEditor component from @kbn/esql/public
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    dataTestSubj,
    errors,
    warning,
  }: {
    query: AggregateQuery;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    dataTestSubj?: string;
    errors?: Error[];
    warning?: string;
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
      {warning && <div data-test-subj={`${dataTestSubj}-warning`}>{warning}</div>}
    </div>
  ),
}));

// Mock validateEsqlQuery from @kbn/alerting-v2-schemas
jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: jest.fn((query: string) => {
    if (!query || query.trim() === '') {
      return undefined;
    }
    if (!query.toUpperCase().startsWith('FROM')) {
      return 'Invalid ES|QL query: Query must start with FROM';
    }
    return undefined;
  }),
}));

// Mock the recovery query validation hook
jest.mock('../hooks/use_recovery_query_validation', () => ({
  useRecoveryQueryValidation: jest.fn(() => ({
    validationError: undefined,
    missingColumns: [],
    isValidating: false,
    queryColumns: [],
    queryError: null,
    recoveryColumns: [],
  })),
}));

const { useRecoveryQueryValidation } = jest.requireMock(
  '../hooks/use_recovery_query_validation'
) as {
  useRecoveryQueryValidation: jest.Mock;
};

describe('RecoveryBaseQueryField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRecoveryQueryValidation.mockReturnValue({
      validationError: undefined,
      missingColumns: [],
      isValidating: false,
      queryColumns: [],
      queryError: null,
      recoveryColumns: [],
    });
  });

  it('renders the recovery condition label', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.getByText('Recovery query')).toBeInTheDocument();
  });

  it('renders the ES|QL editor', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.getByTestId('recoveryQueryField')).toBeInTheDocument();
  });

  it('seeds recovery query with evaluation query on mount when empty', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-* | STATS count = COUNT(*)' } },
        recoveryPolicy: { type: 'query' },
      }),
    });

    const textarea = screen.getByTestId('recoveryQueryField-editor-input');
    expect(textarea).toHaveValue('FROM logs-* | STATS count = COUNT(*)');
  });

  it('does not overwrite existing recovery query on mount', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        evaluation: { query: { base: 'FROM logs-* | STATS count = COUNT(*)' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-* | WHERE status == "ok"' },
        },
      }),
    });

    const textarea = screen.getByTestId('recoveryQueryField-editor-input');
    expect(textarea).toHaveValue('FROM metrics-* | WHERE status == "ok"');
  });

  it('updates value when user types', async () => {
    const user = userEvent.setup();
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    const textarea = screen.getByTestId('recoveryQueryField-editor-input');
    await user.clear(textarea);
    await user.type(textarea, 'FROM metrics-*');

    expect(textarea).toHaveValue('FROM metrics-*');
  });

  it('displays grouping validation errors', () => {
    useRecoveryQueryValidation.mockReturnValue({
      validationError: 'Recovery query is missing columns used for grouping: host.name',
      missingColumns: ['host.name'],
      isValidating: false,
      queryColumns: [{ name: 'count', type: 'long' }],
      queryError: null,
      recoveryColumns: [{ name: 'count', type: 'long' }],
    });

    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM logs-* | STATS count = COUNT(*)' },
        },
        grouping: { fields: ['host.name'] },
      }),
    });

    expect(
      screen.getByText('Recovery query is missing columns used for grouping: host.name')
    ).toBeInTheDocument();
  });

  it('shows required error when submitted with empty value', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          recoveryPolicy: { type: 'query', query: { base: '' } },
        },
        mode: 'onSubmit',
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormServicesProvider services={services}>
              {children}
              <button type="button" onClick={form.handleSubmit(() => {})}>
                Submit
              </button>
            </RuleFormServicesProvider>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<RecoveryBaseQueryField />, { wrapper: WrapperWithSubmit });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(
        'Recovery query is required when using a custom recovery condition.'
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows additionalValidation error when parent validation fails', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();
    const additionalValidation = jest.fn((value: string | undefined) =>
      value === 'FROM logs-* | STATS count = COUNT(*)'
        ? 'Recovery query must differ from the evaluation query. The same query would never recover.'
        : true
    );

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM logs-* | STATS count = COUNT(*)' },
          },
        },
        mode: 'onSubmit',
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormServicesProvider services={services}>
              {children}
              <button type="button" onClick={form.handleSubmit(() => {})}>
                Submit
              </button>
            </RuleFormServicesProvider>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<RecoveryBaseQueryField additionalValidation={additionalValidation} />, {
      wrapper: WrapperWithSubmit,
    });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(
        'Recovery query must differ from the evaluation query. The same query would never recover.'
      );
      expect(errors.length).toBeGreaterThan(0);
    });

    expect(additionalValidation).toHaveBeenCalledWith('FROM logs-* | STATS count = COUNT(*)');
  });

  it('does not show additionalValidation error when parent validation passes', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();
    const additionalValidation = jest.fn(() => true as const);

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          recoveryPolicy: {
            type: 'query',
            query: { base: 'FROM metrics-* | WHERE status == "ok"' },
          },
        },
        mode: 'onSubmit',
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormServicesProvider services={services}>
              {children}
              <button type="button" onClick={form.handleSubmit(() => {})}>
                Submit
              </button>
            </RuleFormServicesProvider>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<RecoveryBaseQueryField additionalValidation={additionalValidation} />, {
      wrapper: WrapperWithSubmit,
    });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(additionalValidation).toHaveBeenCalled();
    });

    expect(
      screen.queryByText(
        'Recovery query must differ from the evaluation query. The same query would never recover.'
      )
    ).not.toBeInTheDocument();
  });

  it('shows validation error for invalid ES|QL query syntax', async () => {
    const queryClient = createTestQueryClient();
    const services = createMockServices();

    const WrapperWithSubmit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const form = useForm<FormValues>({
        defaultValues: {
          ...defaultTestFormValues,
          recoveryPolicy: { type: 'query', query: { base: 'INVALID QUERY' } },
        },
        mode: 'onSubmit',
      });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormServicesProvider services={services}>
              {children}
              <button type="button" onClick={form.handleSubmit(() => {})}>
                Submit
              </button>
            </RuleFormServicesProvider>
          </FormProvider>
        </QueryClientProvider>
      );
    };

    const user = userEvent.setup();
    render(<RecoveryBaseQueryField />, { wrapper: WrapperWithSubmit });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText('Invalid ES|QL query: Query must start with FROM');
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
