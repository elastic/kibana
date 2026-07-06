/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionHistorySearchBar, type RuleOption } from './execution_history_search_bar';

const mockUseFetchRules = jest.fn();

jest.mock('../../../hooks/use_fetch_rules', () => ({
  useFetchRules: (...args: unknown[]) => mockUseFetchRules(...args),
}));

const rule = (id: string, name: string) => ({ id, metadata: { name } });

const mockRules = (
  overrides: Partial<{
    data: { items: Array<ReturnType<typeof rule>>; total: number };
    isFetching: boolean;
    isLoading: boolean;
  }> = {}
) => {
  mockUseFetchRules.mockReturnValue({
    data: { items: [], total: 0 },
    isFetching: false,
    isLoading: false,
    ...overrides,
  });
};

const setup = (
  overrides: Partial<{
    ruleFilters: RuleOption[];
    onRuleFiltersChange: (rules: RuleOption[]) => void;
    onSearchChange: (value: string) => void;
    onOutcomeChange: (value: 'all' | 'dispatched' | 'throttled') => void;
  }> = {}
) => {
  const onRuleFiltersChange = overrides.onRuleFiltersChange ?? jest.fn();
  const onSearchChange = overrides.onSearchChange ?? jest.fn();
  const onOutcomeChange = overrides.onOutcomeChange ?? jest.fn();

  render(
    <I18nProvider>
      <ExecutionHistorySearchBar
        onSearchChange={onSearchChange}
        outcome="all"
        onOutcomeChange={onOutcomeChange}
        ruleFilters={overrides.ruleFilters ?? []}
        onRuleFiltersChange={onRuleFiltersChange}
      />
    </I18nProvider>
  );

  return { onRuleFiltersChange, onSearchChange, onOutcomeChange };
};

const openRuleFilter = async () => {
  const combo = screen.getByTestId('executionHistoryRuleFilter');
  const input = within(combo).getByRole('combobox');
  await userEvent.click(input);
  return input;
};

describe('ExecutionHistorySearchBar — rule filter combobox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRules();
  });

  it('renders the rule filter combobox', () => {
    setup();
    expect(screen.getByTestId('executionHistoryRuleFilter')).toBeInTheDocument();
  });

  it('fetches rules with no search term on initial render', () => {
    setup();
    expect(mockUseFetchRules).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20, search: undefined })
    );
  });

  it('shows fetched rules as selectable options when the combobox is opened', async () => {
    mockRules({
      data: { items: [rule('rule-1', 'CPU rule'), rule('rule-2', 'Memory rule')], total: 2 },
    });
    setup();

    await openRuleFilter();

    expect(await screen.findByText('CPU rule')).toBeInTheDocument();
    expect(screen.getByText('Memory rule')).toBeInTheDocument();
  });

  it('calls onRuleFiltersChange with the selected rule when picked', async () => {
    mockRules({ data: { items: [rule('rule-1', 'CPU rule')], total: 1 } });
    const { onRuleFiltersChange } = setup();

    await openRuleFilter();
    // EuiPopover panel gets `pointer-events: none` in jsdom for positioning; bypass the check.
    await userEvent.click(await screen.findByText('CPU rule'), {
      pointerEventsCheck: 0,
    });

    expect(onRuleFiltersChange).toHaveBeenCalledWith([{ id: 'rule-1', name: 'CPU rule' }]);
  });

  it('renders already-selected rules as pills', () => {
    setup({
      ruleFilters: [
        { id: 'rule-1', name: 'CPU rule' },
        { id: 'rule-2', name: 'Memory rule' },
      ],
    });

    const combo = screen.getByTestId('executionHistoryRuleFilter');
    expect(within(combo).getByText('CPU rule')).toBeInTheDocument();
    expect(within(combo).getByText('Memory rule')).toBeInTheDocument();
  });

  it('debounces the rule search input before triggering a fetch', async () => {
    setup();

    // Initial call — empty search.
    expect(mockUseFetchRules).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined })
    );

    const input = await openRuleFilter();
    await userEvent.type(input, 'cpu');

    // While debouncing, the fetch argument should still be the previous value.
    expect(mockUseFetchRules).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined })
    );

    await waitFor(
      () => {
        expect(mockUseFetchRules).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'cpu' })
        );
      },
      { timeout: 2000 }
    );
  });

  it('clears the selection when the user removes all pills', async () => {
    mockRules({ data: { items: [rule('rule-1', 'CPU rule')], total: 1 } });
    const { onRuleFiltersChange } = setup({
      ruleFilters: [{ id: 'rule-1', name: 'CPU rule' }],
    });

    const combo = screen.getByTestId('executionHistoryRuleFilter');
    const clearButton = within(combo).getByTestId('comboBoxClearButton');
    await userEvent.click(clearButton);

    expect(onRuleFiltersChange).toHaveBeenCalledWith([]);
  });
});
