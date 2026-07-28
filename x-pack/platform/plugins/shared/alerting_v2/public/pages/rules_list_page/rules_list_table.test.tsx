/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BULK_FILTER_MAX_RESOURCES } from '@kbn/alerting-v2-schemas';
import { contentListQueryClient } from '@kbn/content-list-provider';
import type { RuleApiResponse } from '../../services/rules_api';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RulesListTable } from './rules_list_table';

const mockNavigateToUrl = jest.fn();
const mockFindItems = jest.fn();
const mockBulkEnableMutate = jest.fn();
const mockBulkDisableMutate = jest.fn();
const mockToggleEnabledMutate = jest.fn();

const WRITE_CAPABILITIES = { alerting_v2_rules: { read: true, all: true } };
const READ_ONLY_CAPABILITIES = { alerting_v2_rules: { read: true, all: false } };
let mockCapabilities: Record<string, Record<string, boolean>> = WRITE_CAPABILITIES;

let mockBulkEnableReturn = {
  mutate: mockBulkEnableMutate,
  isLoading: false,
};
let mockBulkDisableReturn = {
  mutate: mockBulkDisableMutate,
  isLoading: false,
};
let mockToggleEnabledReturn: {
  mutate: typeof mockToggleEnabledMutate;
  isLoading: boolean;
  variables: { id: string; enabled: boolean } | undefined;
} = {
  mutate: mockToggleEnabledMutate,
  isLoading: false,
  variables: undefined,
};

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: mockCapabilities });
      }
      if (token === 'application') {
        return { navigateToUrl: mockNavigateToUrl, getUrlForApp: jest.fn() };
      }
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      if (token === 'http') {
        return { basePath: { prepend: (path: string) => path } };
      }
      if (token === 'notifications') {
        return { toasts: { addSuccess: jest.fn(), addError: jest.fn() } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../../hooks/use_delete_rule', () => ({
  useDeleteRule: () => ({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../../hooks/use_bulk_delete_rules', () => ({
  useBulkDeleteRules: () => ({ mutate: jest.fn(), isLoading: false }),
}));
jest.mock('../../hooks/use_bulk_enable_disable_rules', () => ({
  useBulkEnableRules: () => mockBulkEnableReturn,
  useBulkDisableRules: () => mockBulkDisableReturn,
}));
jest.mock('../../hooks/use_toggle_rule_enabled', () => ({
  useToggleRuleEnabled: () => mockToggleEnabledReturn,
}));

jest.mock('../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: () => ({ data: ['prod', 'staging'], isLoading: false }),
}));

jest.mock('./rules_data_source', () => ({
  ...jest.requireActual('./rules_data_source'),
  useRulesDataSource: () => ({ findItems: mockFindItems }),
}));

jest.mock('../../components/rule/flyouts', () => ({
  RuleSummaryFlyout: ({ rule }: { rule: RuleApiResponse }) => (
    <div data-test-subj="mockedSummaryFlyout">Summary for {rule.id}</div>
  ),
}));

jest.mock('../../components/rule/modals/delete_confirmation_modal', () => ({
  DeleteConfirmationModal: () => null,
}));

const createRule = (overrides: Partial<RuleApiResponse> = {}): RuleApiResponse =>
  ({
    id: 'rule-1',
    kind: 'alert',
    enabled: true,
    metadata: {
      name: 'Rule One',
      description: 'Rule description',
      tags: ['prod'],
    },
    schedule: { every: '1m' },
    query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
    createdBy: 'elastic',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  } as RuleApiResponse);

const toListItem = (rule: RuleApiResponse) => ({
  id: rule.id,
  title: rule.metadata?.name ?? rule.id,
  description: rule.metadata?.description,
  tags: rule.metadata?.tags,
  rule,
});

const rowCheckbox = (ruleId: string) =>
  screen.getByTestId(`checkboxSelectRow-content-list-table-row-${ruleId}`);

const renderTable = () =>
  render(
    <ListPageTestProviders>
      <RulesListTable onEditInFlyout={jest.fn()} onCloneInFlyout={jest.fn()} />
    </ListPageTestProviders>
  );

const selectRowAndOpenSelectAll = async (ruleId = 'rule-1') => {
  await waitFor(() => expect(screen.getByText('Rule One')).toBeInTheDocument());
  fireEvent.click(rowCheckbox(ruleId));
  await waitFor(() => expect(screen.getByTestId('selectAllRulesButton')).toBeInTheDocument());
};

describe('RulesListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentListQueryClient.clear();
    mockCapabilities = WRITE_CAPABILITIES;
    mockBulkEnableReturn = {
      mutate: mockBulkEnableMutate,
      isLoading: false,
    };
    mockBulkDisableReturn = {
      mutate: mockBulkDisableMutate,
      isLoading: false,
    };
    mockToggleEnabledReturn = {
      mutate: mockToggleEnabledMutate,
      isLoading: false,
      variables: undefined,
    };
    mockFindItems.mockResolvedValue({
      items: [toListItem(createRule())],
      total: 1,
    });
  });

  it('renders the rule name and description', async () => {
    renderTable();

    await waitFor(() => {
      expect(screen.getByText('Rule One')).toBeInTheDocument();
      expect(screen.getByText('Rule description')).toBeInTheDocument();
    });
  });

  it('renders Status, Tags, and Mode filters', async () => {
    renderTable();

    await waitFor(() => {
      expect(screen.getByTestId('rulesListStatusFilter')).toBeInTheDocument();
      expect(screen.getByTestId('rulesListTagsFilter')).toBeInTheDocument();
      expect(screen.getByTestId('rulesListModeFilter')).toBeInTheDocument();
    });
  });

  it('calls findItems with enabled filter when Status Enabled is selected', async () => {
    renderTable();

    await waitFor(() => expect(screen.getByTestId('rulesListStatusFilter')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));
    const list = await screen.findByTestId('rulesListStatusFilter-list');
    fireEvent.click(within(list).getByText('Enabled'));

    await waitFor(() => {
      const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1][0];
      expect(lastCall.filters.enabled).toMatchObject({ include: ['true'] });
    });
  });

  it('opens the summary flyout from the expand control', async () => {
    renderTable();

    await waitFor(() => expect(screen.getByTestId('expandRule-rule-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('expandRule-rule-1'));

    expect(screen.getByTestId('mockedSummaryFlyout')).toHaveTextContent('Summary for rule-1');
  });

  it('hides write affordances when the user cannot write', async () => {
    mockCapabilities = READ_ONLY_CAPABILITIES;
    renderTable();

    await waitFor(() => expect(screen.getByText('Rule One')).toBeInTheDocument());
    expect(screen.queryByTestId('quickEditRule-rule-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleEnabledBadge-rule-1')).toBeInTheDocument();
  });

  it('truncates tags to show only the first tag and a +N overflow badge', async () => {
    mockFindItems.mockResolvedValue({
      items: [
        toListItem(
          createRule({
            metadata: {
              name: 'Rule One',
              tags: ['new', 'rna', 'staging', 'prod', 'alpha', 'beta', 'gamma', 'delta', 'epsilon'],
            },
          })
        ),
      ],
      total: 1,
    });
    renderTable();

    await waitFor(() => expect(screen.getByText('new')).toBeInTheDocument());
    expect(screen.getByTestId('overflowTagsBadge')).toHaveTextContent('+8');
    expect(screen.queryByText('rna')).not.toBeInTheDocument();
  });

  describe('select all and bulk actions', () => {
    it('exposes select-all test subjects used by Scout', async () => {
      mockFindItems.mockResolvedValue({
        items: [
          toListItem(createRule()),
          toListItem(createRule({ id: 'rule-2', metadata: { name: 'Rule Two' } })),
        ],
        total: 5,
      });
      renderTable();

      await selectRowAndOpenSelectAll();
    });

    it('disables Select all and shows the cap disclosure when total exceeds the bulk limit', async () => {
      mockFindItems.mockResolvedValue({
        items: [toListItem(createRule())],
        total: BULK_FILTER_MAX_RESOURCES + 2000,
      });
      renderTable();

      await selectRowAndOpenSelectAll();
      expect(screen.getByTestId('selectAllRulesButton')).toBeDisabled();
      expect(screen.getByTestId('bulkSelectAllLimitTooltip')).toBeInTheDocument();

      fireEvent.mouseOver(screen.getByTestId('bulkSelectAllLimitTooltip'));
      const disclosure = await screen.findByTestId('bulkSelectAllLimitDisclosure');
      expect(disclosure).toHaveTextContent('Select all is available only when');
    });

    it('does not show the cap disclosure when total is at the bulk limit', async () => {
      mockFindItems.mockResolvedValue({
        items: [toListItem(createRule())],
        total: BULK_FILTER_MAX_RESOURCES,
      });
      renderTable();

      await selectRowAndOpenSelectAll();
      expect(screen.getByTestId('selectAllRulesButton')).not.toBeDisabled();
      expect(screen.queryByTestId('bulkSelectAllLimitTooltip')).not.toBeInTheDocument();
    });

    it('still allows a by-ids bulk action on explicitly selected rows when total exceeds the cap', async () => {
      mockFindItems.mockResolvedValue({
        items: [toListItem(createRule())],
        total: BULK_FILTER_MAX_RESOURCES + 500,
      });
      renderTable();

      await selectRowAndOpenSelectAll();
      expect(screen.getByTestId('selectAllRulesButton')).toBeDisabled();
      expect(screen.getByTestId('bulkActionsButton')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('bulkActionsButton'));
      fireEvent.click(await screen.findByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_ids', ids: ['rule-1'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('sends by_query match_all when select all is used for bulk enable', async () => {
      mockFindItems.mockResolvedValue({
        items: [
          toListItem(createRule()),
          toListItem(createRule({ id: 'rule-2', metadata: { name: 'Rule Two' } })),
        ],
        total: 5,
      });
      renderTable();

      await selectRowAndOpenSelectAll();
      fireEvent.click(screen.getByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));
      fireEvent.click(await screen.findByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_query', match_all: true },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('scopes by_query bulk enable to the active filter when select all is used', async () => {
      mockFindItems.mockResolvedValue({
        items: [
          toListItem(createRule()),
          toListItem(createRule({ id: 'rule-2', metadata: { name: 'Rule Two' } })),
        ],
        total: 5,
      });
      renderTable();

      await waitFor(() => expect(screen.getByTestId('rulesListModeFilter')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('rulesListModeFilter'));
      const list = await screen.findByTestId('rulesListModeFilter-list');
      fireEvent.click(within(list).getByText('Alert'));

      await waitFor(() => {
        const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1][0];
        expect(lastCall.filters.kind).toMatchObject({ include: ['alert'] });
      });

      await selectRowAndOpenSelectAll();
      fireEvent.click(screen.getByTestId('selectAllRulesButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bulkActionsButton'));
      fireEvent.click(await screen.findByTestId('bulkEnableRules'));

      expect(mockBulkEnableMutate).toHaveBeenCalledWith(
        { mode: 'by_query', filter: 'kind: alert' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  describe('toggle enabled', () => {
    beforeEach(() => {
      mockFindItems.mockResolvedValue({
        items: [
          toListItem(createRule({ id: 'rule-1', enabled: true })),
          toListItem(
            createRule({
              id: 'rule-2',
              enabled: false,
              metadata: { name: 'Rule Two', tags: [] },
            })
          ),
        ],
        total: 2,
      });
    });

    it('shows a spinner in place of the switch for the rule being toggled', async () => {
      mockToggleEnabledReturn = {
        mutate: mockToggleEnabledMutate,
        isLoading: true,
        variables: { id: 'rule-1', enabled: false },
      };
      renderTable();

      await waitFor(() =>
        expect(screen.getByTestId('ruleEnabledSpinner-rule-1')).toBeInTheDocument()
      );
      expect(screen.queryByTestId('ruleEnabledSwitch-rule-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeInTheDocument();
    });

    it('disables the other switches while a toggle is in flight', async () => {
      mockToggleEnabledReturn = {
        mutate: mockToggleEnabledMutate,
        isLoading: true,
        variables: { id: 'rule-1', enabled: false },
      };
      renderTable();

      await waitFor(() => expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled());
    });

    it('disables all switches while a bulk enable mutation is in flight', async () => {
      mockBulkEnableReturn = {
        mutate: mockBulkEnableMutate,
        isLoading: true,
      };
      renderTable();

      await waitFor(() => {
        expect(screen.getByTestId('ruleEnabledSwitch-rule-1')).toBeDisabled();
        expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled();
      });
    });

    it('disables all switches while a bulk disable mutation is in flight', async () => {
      mockBulkDisableReturn = {
        mutate: mockBulkDisableMutate,
        isLoading: true,
      };
      renderTable();

      await waitFor(() => {
        expect(screen.getByTestId('ruleEnabledSwitch-rule-1')).toBeDisabled();
        expect(screen.getByTestId('ruleEnabledSwitch-rule-2')).toBeDisabled();
      });
    });
  });

  it('surfaces fetch failures on the table instead of the empty create state', async () => {
    mockFindItems.mockRejectedValue(new Error('boom from server'));
    renderTable();

    await waitFor(() => {
      expect(screen.getByText('boom from server')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ruleCreateOptionsPanel')).not.toBeInTheDocument();
  });
});
