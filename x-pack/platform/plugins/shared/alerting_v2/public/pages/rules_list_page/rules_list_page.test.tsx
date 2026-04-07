/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RulesListPage, SEARCH_DEBOUNCE_MS } from './rules_list_page';

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn((appId: string, options?: { path?: string }) => {
  const path = options?.path ?? '';
  return `/app/${appId}${path}`;
});
const mockDocTitleChange = jest.fn();

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl, getUrlForApp: mockGetUrlForApp };
    }
    if (token === 'chrome') {
      return { docTitle: { change: mockDocTitleChange } };
    }
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const mockUseFetchRules = jest.fn();
jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: (...args: unknown[]) => mockUseFetchRules(...args),
}));

jest.mock('../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: () => ({ data: ['prod'], isLoading: false, isError: false }),
}));

const mockDeleteMutate = jest.fn();
const mockUseDeleteRule = jest.fn();
jest.mock('../../hooks/use_delete_rule', () => ({
  useDeleteRule: () => mockUseDeleteRule(),
}));

const mockBulkDeleteMutate = jest.fn();
jest.mock('../../hooks/use_bulk_delete_rules', () => ({
  useBulkDeleteRules: () => ({ mutate: mockBulkDeleteMutate, isLoading: false }),
}));

const mockBulkEnableMutate = jest.fn();
const mockBulkDisableMutate = jest.fn();
jest.mock('../../hooks/use_bulk_enable_disable_rules', () => ({
  useBulkEnableRules: () => ({ mutate: mockBulkEnableMutate, isLoading: false }),
  useBulkDisableRules: () => ({ mutate: mockBulkDisableMutate, isLoading: false }),
}));

const mockToggleEnabledMutate = jest.fn();
const mockUseToggleRuleEnabled = jest.fn();
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => mockUseToggleRuleEnabled(),
}));

const mockRules = [
  {
    id: 'rule-1',
    kind: 'alert',
    enabled: true,
    metadata: { name: 'Rule One', description: 'Monitors log errors', tags: ['prod'] },
    schedule: { every: '1m' },
    evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
  },
  {
    id: 'rule-2',
    kind: 'alert',
    enabled: false,
    metadata: { name: 'Rule Two', tags: [] },
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
    mockUseToggleRuleEnabled.mockReturnValue({
      mutate: mockToggleEnabledMutate,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('renders the search bar', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByPlaceholderText('Search rules')).toBeInTheDocument();
  });

  it('renders description under the rule name when present', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('Monitors log errors')).toBeInTheDocument();
  });

  it('does not render description when not present', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Rule Two has no description — should only show the name
    const ruleTwoName = screen.getByText('Rule Two');
    expect(ruleTwoName.closest('div')?.querySelectorAll('.euiText--extraSmall')).toHaveLength(0);
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

  it('shows "Showing 0-0 of 0 Rules" when there are no rules', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const showingLabel = screen.getByTestId('rulesListShowingLabel');
    expect(showingLabel).toHaveTextContent('Showing 0-0 of 0 Rules');
  });

  it('shows correct "Showing" range when rules exist', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const showingLabel = screen.getByTestId('rulesListShowingLabel');
    expect(showingLabel).toHaveTextContent('Showing 1-2 of 2 Rules');
  });

  it('passes the debounced search term to useFetchRules', async () => {
    jest.useFakeTimers();
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Search rules'), {
      target: { value: 'Rule One' },
    });

    expect(mockUseFetchRules).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      filter: undefined,
      search: undefined,
      sortField: 'name',
      sortOrder: 'asc',
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: 'Rule One',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('clearing the search resets the fetch back to an unfiltered list', async () => {
    jest.useFakeTimers();
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const searchInput = screen.getByPlaceholderText('Search rules');

    fireEvent.change(searchInput, {
      target: { value: 'prod' },
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: 'prod',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    fireEvent.change(searchInput, {
      target: { value: '' },
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: undefined,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('resets pagination to the first page after a new search', async () => {
    jest.useFakeTimers();
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 40, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByLabelText('Next page'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 2,
        perPage: 20,
        filter: undefined,
        search: undefined,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    fireEvent.change(screen.getByPlaceholderText('Search rules'), {
      target: { value: 'Rule' },
    });

    expect(mockUseFetchRules).toHaveBeenLastCalledWith({
      page: 2,
      perPage: 20,
      filter: undefined,
      search: undefined,
      sortField: 'name',
      sortOrder: 'asc',
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: 'Rule',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('renders filter controls', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('rulesListStatusFilter')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListTagsFilter')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListModeFilter')).toBeInTheDocument();
  });

  it('does not show an active count on the status filter when nothing is selected', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('rulesListStatusFilter')).toHaveTextContent(/^Status$/);
  });

  it('passes status filters to useFetchRules', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));
    fireEvent.click(screen.getByTestId('rulesListStatusFilterOption-true'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: 'enabled: true',
        search: undefined,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('passes tags filters to useFetchRules', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByTestId('rulesListTagsFilterOption-prod'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: '(metadata.tags: "prod")',
        search: undefined,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('passes mode filters to useFetchRules', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('rulesListModeFilter'));
    fireEvent.click(screen.getByTestId('rulesListModeFilterOption-signal'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: 'kind: signal',
        search: undefined,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  it('uses name ascending as the default sort', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(mockUseFetchRules).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      filter: undefined,
      search: undefined,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });

  it('sorts by name when the Name header is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const nameHeader = screen.getByRole('columnheader', { name: /^name$/i });
    fireEvent.click(within(nameHeader).getByRole('button'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: undefined,
        sortField: 'name',
        sortOrder: 'desc',
      });
    });
  });

  it('sorts by mode when the Mode header is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const modeHeader = screen.getByRole('columnheader', { name: /^mode$/i });
    fireEvent.click(within(modeHeader).getByRole('button'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: undefined,
        sortField: 'kind',
        sortOrder: 'asc',
      });
    });
  });

  it('changes sort parameters when a sortable header is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const statusHeader = screen.getByRole('columnheader', { name: /^status$/i });
    fireEvent.click(within(statusHeader).getByRole('button'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 20,
        filter: undefined,
        search: undefined,
        sortField: 'enabled',
        sortOrder: 'asc',
      });
    });
  });

  it('toggles sort direction when the same header is clicked twice', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    const statusHeader = screen.getByRole('columnheader', { name: /^status$/i });
    fireEvent.click(within(statusHeader).getByRole('button'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortField: 'enabled', sortOrder: 'asc' })
      );
    });

    fireEvent.click(within(statusHeader).getByRole('button'));

    await waitFor(() => {
      expect(mockUseFetchRules).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortField: 'enabled', sortOrder: 'desc' })
      );
    });
  });

  it('navigates to create page when create button is clicked', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('createRuleButton')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/rules/create'
    );
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

  it('renders the Status column with Enabled and Disabled badges', () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows "Disable" action for enabled rules and "Enable" for disabled rules', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Open the context menu for the enabled rule (rule-1)
    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

    await waitFor(() => {
      expect(screen.getByTestId('toggleEnabledRule-rule-1')).toHaveTextContent('Disable');
    });
  });

  it('calls toggleEnabledMutation when toggle action is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    // Open the context menu for the enabled rule (rule-1)
    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

    // Click the toggle action — should disable the enabled rule
    fireEvent.click(screen.getByTestId('toggleEnabledRule-rule-1'));

    expect(mockToggleEnabledMutate).toHaveBeenCalledWith({ id: 'rule-1', enabled: false });
  });

  it('shows "Clone" action in the context menu', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cloneRule-rule-1')).toHaveTextContent('Clone');
    });
  });

  it('navigates to the create page with cloneFrom query param when clone is clicked', async () => {
    mockUseFetchRules.mockReturnValue({
      data: { items: mockRules, total: 2, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));
    fireEvent.click(screen.getByTestId('cloneRule-rule-1'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/management/alertingV2/rules/create?cloneFrom=rule-1'
    );
  });

  describe('selection', () => {
    beforeEach(() => {
      mockUseFetchRules.mockReturnValue({
        data: { items: mockRules, total: 2, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('renders selection checkboxes for each row', () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      // 1 header "select all" checkbox + 2 row checkboxes
      expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    });

    it('does not show selected count or clear button when no rules are selected', () => {
      renderPage();

      expect(screen.queryByTestId('bulkActionsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clearSelectionButton')).not.toBeInTheDocument();
    });

    it('shows selected count when rules are selected', async () => {
      renderPage();

      // Click the first row checkbox (skip index 0 which is "select all")
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('1 Selected');
      });
    });

    it('shows clear selection button when rules are selected', async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('clearSelectionButton')).toBeInTheDocument();
      });
    });

    it('updates selected count when selecting multiple rules', async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      // Select both rows
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('2 Selected');
      });
    });

    it('clears selection when clear button is clicked', async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clearSelectionButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('bulkActionsButton')).not.toBeInTheDocument();
        expect(screen.queryByTestId('clearSelectionButton')).not.toBeInTheDocument();
      });
    });

    it('selects all rules when header checkbox is clicked', async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      // Click the header "select all" checkbox (first checkbox)
      fireEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('2 Selected');
      });
    });
  });

  describe('bulk actions menu', () => {
    beforeEach(() => {
      mockUseFetchRules.mockReturnValue({
        data: { items: mockRules, total: 2, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    const selectFirstRuleAndOpenMenu = async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));
    };

    it('opens context menu with enable, disable, and delete options', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
        expect(screen.getByTestId('bulkDisableRules')).toBeInTheDocument();
        expect(screen.getByTestId('bulkDeleteRules')).toBeInTheDocument();
      });
    });

    it('shows bulk delete confirmation modal when delete is clicked', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkDeleteRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toHaveTextContent(/1 rule/);
      });

      // Mutation should NOT have been called yet
      expect(mockBulkDeleteMutate).not.toHaveBeenCalled();
    });

    it('calls bulkDeleteRules when bulk delete is confirmed', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkDeleteRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockBulkDeleteMutate).toHaveBeenCalledWith(
        { ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });

    it('dismisses bulk delete modal on cancel', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkDeleteRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();
      });
    });

    it('calls bulkEnableRules with selected ids when enable is clicked', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('calls bulkDisableRules with selected ids when disable is clicked', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkDisableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkDisableRules'));

      expect(mockBulkDisableMutate).toHaveBeenCalledWith(
        { ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('shows correct count in bulk delete modal when multiple rules are selected', async () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('2 Selected');
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkDeleteRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toHaveTextContent(/2 rules/);
      });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockBulkDeleteMutate).toHaveBeenCalledWith(
        { ids: expect.arrayContaining(['rule-1', 'rule-2']) },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });

    it('closes the popover after clicking a bulk action', async () => {
      await selectFirstRuleAndOpenMenu();

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      await waitFor(() => {
        expect(screen.queryByTestId('bulkEnableRules')).not.toBeInTheDocument();
      });
    });
  });
});
