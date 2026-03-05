/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RulesListPage } from './rules_list_page';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
}));

const mockUseFetchRules = jest.fn();
jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: (...args: unknown[]) => mockUseFetchRules(...args),
}));

const mockDeleteMutate = jest.fn();
const mockUseDeleteRule = jest.fn();
jest.mock('../../hooks/use_delete_rule', () => ({
  useDeleteRule: () => mockUseDeleteRule(),
}));

const mockRules = [
  {
    id: 'rule-1',
    kind: 'alert',
    enabled: true,
    metadata: { name: 'Rule One', labels: ['prod'] },
    schedule: { every: '1m' },
    evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
  },
  {
    id: 'rule-2',
    kind: 'alert',
    enabled: false,
    metadata: { name: 'Rule Two', labels: [] },
    schedule: { every: '5m' },
    evaluation: { query: { base: 'FROM metrics-*' } },
  },
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const renderPage = () => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <I18nProvider>
          <RulesListPage />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('RulesListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteRule.mockReturnValue({
      mutate: mockDeleteMutate,
      isLoading: false,
    });
  });

  it('renders loading state', () => {
    mockUseFetchRules.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders rules in the table', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('Rule One')).toBeInTheDocument();
    expect(screen.getByText('Rule Two')).toBeInTheDocument();
  });

  it('renders the Source column with extracted data source', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.getByText('metrics-*')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseFetchRules.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    renderPage();

    expect(screen.getByText('Failed to load rules')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('navigates to create page when create button is clicked', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('createRuleButton'));

    expect(mockHistoryPush).toHaveBeenCalledWith('/create');
  });

  it('shows delete confirmation modal when delete action is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Open the context menu for the first rule
    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

    // Click the delete item in the context menu
    fireEvent.click(screen.getByTestId('deleteRule-rule-1'));

    await waitFor(() => {
      expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('deleteRuleConfirmationModal')).toHaveTextContent(/Rule One/);
  });

  it('calls deleteRule mutation when delete is confirmed', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Open the context menu for the first rule
    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

    // Click the delete item
    fireEvent.click(screen.getByTestId('deleteRule-rule-1'));

    await waitFor(() => {
      expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'rule-1',
      expect.objectContaining({
        onSettled: expect.any(Function),
      })
    );
  });
});
