/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RulesListTableContainer } from './rules_list_table_container';

const mockNavigateToUrl = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl };
    }
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
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

const renderContainer = (overrides = {}) => {
  const props = {
    items: mockRules as any,
    totalItemCount: 2,
    page: 1,
    perPage: 20,
    search: '',
    hasActiveFilters: false,
    isLoading: false,
    onTableChange: jest.fn(),
    ...overrides,
  };
  return render(
    <I18nProvider>
      <RulesListTableContainer {...props} />
    </I18nProvider>
  );
};

describe('RulesListTableContainer', () => {
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

  it('renders the rules list table', () => {
    renderContainer();

    expect(screen.getByTestId('rulesListTable')).toBeInTheDocument();
    expect(screen.getByText('Rule One')).toBeInTheDocument();
    expect(screen.getByText('Rule Two')).toBeInTheDocument();
  });

  describe('navigation callbacks', () => {
    it('navigates to edit page when edit action is clicked', async () => {
      renderContainer();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('editRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('editRule-rule-1'));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        '/app/management/alertingV2/rules/edit/rule-1'
      );
    });

    it('navigates to clone page when clone action is clicked', async () => {
      renderContainer();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('cloneRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cloneRule-rule-1'));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        '/app/management/alertingV2/rules/create?cloneFrom=rule-1'
      );
    });
  });

  describe('single rule delete', () => {
    it('shows delete confirmation modal when delete action is clicked', async () => {
      renderContainer();

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
        'rule-1',
        expect.objectContaining({ onSettled: expect.any(Function) })
      );
    });

    it('dismisses the modal on cancel', async () => {
      renderContainer();

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

  describe('toggle enabled', () => {
    it('calls toggleEnabled mutation with inverted enabled state', async () => {
      renderContainer();

      fireEvent.click(screen.getByTestId('ruleActionsButton-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('toggleEnabledRule-rule-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('toggleEnabledRule-rule-1'));

      expect(mockToggleEnabledMutate).toHaveBeenCalledWith({ id: 'rule-1', enabled: false });
    });
  });

  describe('bulk actions', () => {
    const selectFirstRuleAndOpenMenu = async () => {
      renderContainer();

      // Select the first rule
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();
      });

      // Open bulk actions popover
      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });
    };

    it('calls bulkEnableRules with selected ids', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('calls bulkDisableRules with selected ids', async () => {
      await selectFirstRuleAndOpenMenu();

      fireEvent.click(screen.getByTestId('bulkDisableRules'));

      expect(mockBulkDisableMutate).toHaveBeenCalledWith(
        { ids: ['rule-1'] },
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
        { ids: ['rule-1'] },
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

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('selectAllRulesButton')).toHaveTextContent('Select all 2 rules');
      });
    });

    it('sends filter param when select all is used for bulk enable', async () => {
      renderContainer();

      // Select a rule first to reveal toolbar
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByTestId('selectAllRulesButton')).toBeInTheDocument();
      });

      // Click "Select all"
      fireEvent.click(screen.getByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
      });

      // Open bulk actions menu
      fireEvent.click(screen.getByTestId('bulkActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('bulkEnableRules')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { filter: '' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });
});
