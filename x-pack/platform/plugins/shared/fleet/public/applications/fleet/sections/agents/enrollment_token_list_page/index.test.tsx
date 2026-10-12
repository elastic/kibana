/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';
import type { EnrollmentAPIKey } from '../../../types';
import { useGetEnrollmentAPIKeysQuery } from '../../../hooks';

import { EnrollmentTokenListPage } from '.';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useBreadcrumbs: jest.fn(),
  usePagination: jest.fn().mockReturnValue({
    pagination: { currentPage: 1, pageSize: 20 },
    setPagination: jest.fn(),
    pageSizeOptions: [10, 25, 50],
  }),
  useGetEnrollmentAPIKeysQuery: jest.fn(),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    isLoading: false,
    isInitialRequest: false,
    data: { items: [] },
  }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
        addWarning: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
  sendBulkDeleteEnrollmentAPIKeys: jest.fn(),
}));

jest.mock('../../../layouts', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../components/search_bar', () => ({
  SearchBar: () => null,
}));

jest.mock('../agent_list_page/components/filter_bar/agent_policy_filter', () => ({
  AgentPolicyFilter: () => null,
}));

// Render HierarchicalActionsMenu items inline so tests don't need to open a popover
jest.mock('../components', () => ({
  HierarchicalActionsMenu: ({
    items,
  }: {
    items: Array<{
      id: string;
      name: string;
      disabled?: boolean;
      onClick: () => void;
      'data-test-subj'?: string;
    }>;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.id}
          data-test-subj={item['data-test-subj']}
          disabled={item.disabled}
          onClick={item.onClick}
        >
          {item.name}
        </button>
      ))}
    </div>
  ),
}));

const mockUseGetEnrollmentAPIKeysQuery = useGetEnrollmentAPIKeysQuery as jest.Mock;

const ACTIVE_TOKEN: EnrollmentAPIKey = {
  id: 'tok-active',
  api_key_id: 'ak-active',
  api_key: 'key-active',
  name: 'Active Token',
  active: true,
  policy_id: 'pol-1',
  created_at: '2024-01-01T00:00:00.000Z',
};

const REVOKED_TOKEN: EnrollmentAPIKey = {
  id: 'tok-revoked',
  api_key_id: 'ak-revoked',
  api_key: 'key-revoked',
  name: 'Revoked Token',
  active: false,
  policy_id: 'pol-1',
  created_at: '2024-01-01T00:00:00.000Z',
};

function mockTokens(tokens: EnrollmentAPIKey[]) {
  mockUseGetEnrollmentAPIKeysQuery.mockReturnValue({
    data: { items: tokens, total: tokens.length },
    isLoading: false,
    isInitialLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  });
}

describe('EnrollmentTokenListPage — bulk actions menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function render() {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<EnrollmentTokenListPage />);
  }

  it('shows bulk revoke as disabled when all selected tokens are already revoked', async () => {
    mockTokens([REVOKED_TOKEN]);
    const utils = render();

    // Row checkboxes: index 0 = select-all, index 1 = first data row
    const checkboxes = utils.getAllByRole('checkbox');
    act(() => {
      fireEvent.click(checkboxes[1]);
    });

    await waitFor(() => {
      expect(utils.getByTestId('enrollmentTokensList.bulkRevokeButton')).toBeDisabled();
    });
  });

  it('shows bulk revoke as enabled when selection includes at least one active token', async () => {
    mockTokens([ACTIVE_TOKEN, REVOKED_TOKEN]);
    const utils = render();

    // Select all rows (mixed: one active, one revoked)
    act(() => {
      fireEvent.click(utils.getAllByRole('checkbox')[0]);
    });

    await waitFor(() => {
      expect(utils.getByTestId('enrollmentTokensList.bulkRevokeButton')).not.toBeDisabled();
    });
  });

  it('shows bulk revoke as enabled when only active tokens are selected', async () => {
    mockTokens([ACTIVE_TOKEN]);
    const utils = render();

    act(() => {
      fireEvent.click(utils.getAllByRole('checkbox')[1]);
    });

    await waitFor(() => {
      expect(utils.getByTestId('enrollmentTokensList.bulkRevokeButton')).not.toBeDisabled();
    });
  });
});
