/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentListProvider } from '@kbn/content-list';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { I18nProvider } from '@kbn/i18n-react';
import { BULK_FILTER_MAX_RESOURCES } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../../services/rules_api';
import { RulesListTableContainer } from './rules_list_table_container';

const mockNavigateToUrl = jest.fn();

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return {
          canWrite: () => true,
          canRead: () => true,
          can: () => true,
        };
      }
      if (token === 'application') {
        return { navigateToUrl: mockNavigateToUrl };
      }
      if (token === 'http') {
        return { basePath: { prepend: (p: string) => p } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

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
const mockUseBulkEnableRules = jest.fn();
const mockUseBulkDisableRules = jest.fn();
jest.mock('../../hooks/use_bulk_enable_disable_rules', () => ({
  useBulkEnableRules: () => mockUseBulkEnableRules(),
  useBulkDisableRules: () => mockUseBulkDisableRules(),
}));

const mockToggleEnabledMutate = jest.fn();
const mockUseToggleRuleEnabled = jest.fn();
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => mockUseToggleRuleEnabled(),
}));

const mockRunRuleMutate = jest.fn();
const mockUseRunRule = jest.fn();
jest.mock('../../hooks/use_run_rule', () => ({
  useRunRule: () => mockUseRunRule(),
}));

const mockToRulesQueryParams = jest.fn(() => ({
  filter: undefined as string | undefined,
  search: undefined as string | undefined,
}));
jest.mock('./rules_query_params', () => ({
  ...jest.requireActual('./rules_query_params'),
  toRulesQueryParams: (...args: unknown[]) => mockToRulesQueryParams(...args),
}));

const mockRules = [
  {
    id: 'rule-1',
    kind: 'alert',
    enabled: true,
    metadata: { name: 'Rule One', tags: ['prod'] },
    schedule: { every: '1m' },
    query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
  },
  {
    id: 'rule-2',
    kind: 'alert',
    enabled: false,
    metadata: { name: 'Rule Two', tags: [] },
    schedule: { every: '5m' },
    query: { format: 'standalone', breach: { query: 'FROM metrics-*' } },
  },
] as RuleApiResponse[];

const toListItem = (rule: RuleApiResponse) => ({
  id: rule.id,
  title: rule.metadata?.name ?? rule.id,
  description: rule.metadata?.description,
  tags: rule.metadata?.tags,
  rule,
});

const mockOnEditInFlyout = jest.fn();
const mockOnCloneInFlyout = jest.fn();

const renderContainer = ({ total = mockRules.length }: { total?: number } = {}) => {
  return render(
    <I18nProvider>
      <ContentListProvider
        id="rules-list-table-container-test"
        labels={{ entity: 'rule', entityPlural: 'rules' }}
        dataSource={{
          findItems: async () => ({
            items: mockRules.map(toListItem),
            total,
          }),
        }}
        features={{
          sorting: { initialSort: { field: 'name', direction: 'asc' } },
          pagination: { initialPageSize: 20 },
          search: true,
          selection: false,
        }}
      >
        <RulesListTableContainer
          onEditInFlyout={mockOnEditInFlyout}
          onCloneInFlyout={mockOnCloneInFlyout}
        />
      </ContentListProvider>
    </I18nProvider>
  );
};

const waitForRules = async () => {
  await waitFor(() => {
    expect(screen.getByText('Rule One')).toBeInTheDocument();
  });
};

describe('RulesListTableContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentListQueryClient.clear();
    mockToRulesQueryParams.mockReturnValue({ filter: undefined, search: undefined });
    mockUseDeleteRule.mockReturnValue({
      mutate: mockDeleteMutate,
      isLoading: false,
    });
    mockUseToggleRuleEnabled.mockReturnValue({
      mutate: mockToggleEnabledMutate,
      isLoading: false,
    });
    mockUseBulkEnableRules.mockReturnValue({
      mutate: mockBulkEnableMutate,
      isLoading: false,
    });
    mockUseBulkDisableRules.mockReturnValue({
      mutate: mockBulkDisableMutate,
      isLoading: false,
    });
    mockUseRunRule.mockReturnValue({
      mutate: mockRunRuleMutate,
      isLoading: false,
    });
  });

  it('renders the rules list table', async () => {
    renderContainer();
    await waitForRules();

    expect(screen.getByTestId('rulesListTable')).toBeInTheDocument();
    expect(screen.getByText('Rule Two')).toBeInTheDocument();
  });

  describe('navigation callbacks', () => {
    it('calls onEditInFlyout when edit action is clicked', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('editRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('editRule-rule-1'));

      expect(mockOnEditInFlyout).toHaveBeenCalledWith(expect.objectContaining({ id: 'rule-1' }));
    });

    it('calls onCloneInFlyout when clone action is clicked', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('cloneRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cloneRule-rule-1'));

      expect(mockOnCloneInFlyout).toHaveBeenCalledWith(expect.objectContaining({ id: 'rule-1' }));
    });
  });

  describe('single rule delete', () => {
    it('shows delete confirmation modal when delete action is clicked', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('deleteRule-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toHaveTextContent(/Rule One/);
      });
    });

    it('calls deleteRule mutation when confirmed', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('deleteRule-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { id: 'rule-1', name: 'Rule One' },
        expect.objectContaining({ onSettled: expect.any(Function) })
      );
    });

    it('dismisses the modal on cancel', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('deleteRule-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();
      });
    });
  });

  describe('run rule', () => {
    it('calls runRule mutation when run action is clicked', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      expect(await screen.findByTestId('runRule-rule-1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('runRule-rule-1'));

      expect(mockRunRuleMutate).toHaveBeenCalledWith({ id: 'rule-1' });
    });
  });

  describe('toggle enabled', () => {
    it('calls toggleEnabled mutation with inverted enabled state', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('ruleEnabledSwitch-rule-1'));

      expect(mockToggleEnabledMutate).toHaveBeenCalledWith({
        id: 'rule-1',
        enabled: false,
      });
    });

    it('shows a spinner in place of the switch for the rule being toggled', async () => {
      mockUseToggleRuleEnabled.mockReturnValue({
        mutate: mockToggleEnabledMutate,
        isLoading: true,
        variables: { id: 'rule-1', enabled: false },
      });

      renderContainer();
      await waitForRules();

      expect(screen.getByTestId('ruleEnabledSpinner-rule-1')).toBeInTheDocument();
      expect(screen.queryByTestId('ruleEnabledSwitch-rule-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeInTheDocument();
    });

    it('disables the other switches while a toggle is in flight, preventing a second toggle from being dispatched', async () => {
      mockUseToggleRuleEnabled.mockReturnValue({
        mutate: mockToggleEnabledMutate,
        isLoading: true,
        variables: { id: 'rule-1', enabled: false },
      });

      renderContainer();
      await waitForRules();

      expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled();
    });

    it('disables all switches while a bulk enable mutation is in flight', async () => {
      mockUseBulkEnableRules.mockReturnValue({
        mutate: mockBulkEnableMutate,
        isLoading: true,
      });

      renderContainer();
      await waitForRules();

      expect(screen.getByTestId('ruleEnabledSwitch-rule-1')).toBeDisabled();
      expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled();
    });

    it('disables all switches while a bulk disable mutation is in flight', async () => {
      mockUseBulkDisableRules.mockReturnValue({
        mutate: mockBulkDisableMutate,
        isLoading: true,
      });

      renderContainer();
      await waitForRules();

      expect(screen.getByTestId('ruleEnabledSwitch-rule-1')).toBeDisabled();
      expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled();
    });
  });

  describe('bulk actions', () => {
    const selectFirstRuleAndOpenMenu = async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });
    };

    it('calls bulkEnableRules with selected ids', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_ids', ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('calls bulkDisableRules with selected ids', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkDisableRules'));

      expect(mockBulkDisableMutate).toHaveBeenCalledWith(
        { mode: 'by_ids', ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('shows bulk delete confirmation modal', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toHaveTextContent(/1 rule/);
      });

      expect(mockBulkDeleteMutate).not.toHaveBeenCalled();
    });

    it('calls bulkDeleteRules when bulk delete is confirmed', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockBulkDeleteMutate).toHaveBeenCalledWith(
        { mode: 'by_ids', ids: ['rule-1'] },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('dismisses bulk delete modal on cancel', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkDeleteRules'));

      await waitFor(() => {
        expect(screen.getByTestId('deleteRuleConfirmationModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('deleteRuleConfirmationModal')).not.toBeInTheDocument();
      });
    });
  });

  describe('select all', () => {
    it('shows "Select all" button after selecting a rule', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selectAllRulesButton')).toHaveTextContent('Select all 2 rules');
      });
    });

    it('disables select-all and shows a help tip when total exceeds bulk cap', async () => {
      renderContainer({ total: BULK_FILTER_MAX_RESOURCES + 500 });
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      const selectAll = await screen.findByTestId('selectAllRulesButton');
      expect(selectAll).toBeDisabled();
      expect(screen.getByTestId('bulkSelectAllLimitTooltip')).toBeInTheDocument();
    });

    it('still allows a by-ids bulk action on explicitly selected rows when total exceeds the cap', async () => {
      renderContainer({ total: BULK_FILTER_MAX_RESOURCES + 500 });
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      expect(await screen.findByTestId('bulkActionsButton')).toBeInTheDocument();
      expect(screen.getByTestId('selectAllRulesButton')).toBeDisabled();

      fireEvent.click(await screen.findByTestId('bulkActionsButton'));

      const bulkEnableRules = await screen.findByTestId('bulkEnableRules');

      fireEvent.click(bulkEnableRules);

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_ids', ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('sends match_all when select all is used for bulk enable', async () => {
      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selectAllRulesButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_query', match_all: true },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('scopes bulk enable filter to active filters when select all', async () => {
      mockToRulesQueryParams.mockReturnValue({ filter: 'kind: alert', search: undefined });

      renderContainer();
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selectAllRulesButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_query', filter: '(kind: alert)' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('folds deselected rows into a NOT exclusion clause under select-all', async () => {
      renderContainer({ total: 40 });
      await waitForRules();

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));
      fireEvent.click(await screen.findByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('40 Selected');
      });

      // Deselect one row — exclusions fold into the by-query filter.
      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('39 Selected');
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));
      fireEvent.click(await screen.findByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        {
          mode: 'by_query',
          filter: 'NOT (id: "rule-1")',
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('keeps select-all selection after a page change', async () => {
      const page1 = mockRules;
      const page2 = [
        {
          ...mockRules[0],
          id: 'rule-3',
          metadata: { name: 'Rule Three', tags: [] },
        },
        {
          ...mockRules[1],
          id: 'rule-4',
          metadata: { name: 'Rule Four', tags: [] },
        },
      ] as RuleApiResponse[];

      render(
        <I18nProvider>
          <ContentListProvider
            id="rules-list-selection-page-test"
            labels={{ entity: 'rule', entityPlural: 'rules' }}
            dataSource={{
              findItems: async ({ page }) => ({
                items: (page.index === 0 ? page1 : page2).map(toListItem),
                total: 40,
              }),
            }}
            features={{
              sorting: { initialSort: { field: 'name', direction: 'asc' } },
              pagination: { initialPageSize: 2 },
              search: true,
              selection: false,
            }}
          >
            <RulesListTableContainer
              onEditInFlyout={mockOnEditInFlyout}
              onCloneInFlyout={mockOnCloneInFlyout}
            />
          </ContentListProvider>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Rule One')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));
      fireEvent.click(await screen.findByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('40 Selected');
      });

      fireEvent.click(await screen.findByTestId('pagination-button-next'));

      await waitFor(() => {
        expect(screen.getByText('Rule Three')).toBeInTheDocument();
      });

      // Select-all intent survives pagination; page-2 rows stay checked.
      expect(screen.getByTestId('bulkActionsButton')).toHaveTextContent('40 Selected');
      expect(screen.getByTestId('checkboxSelectRow-rule-3')).toBeChecked();
      expect(screen.getByTestId('checkboxSelectRow-rule-4')).toBeChecked();
    });
  });
});
