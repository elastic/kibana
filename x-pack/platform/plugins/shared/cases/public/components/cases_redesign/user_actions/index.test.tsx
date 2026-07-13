/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { UserActions } from '.';
import { basicCase } from '../../../containers/mock';
import { getCaseConnectorsMockResponse } from '../../../common/mock/connectors';
import { casesConfigurationsMock } from '../../../containers/configure/mock';
import { useInfiniteFindCaseUserActions } from '../../../containers/use_infinite_find_case_user_actions';
import { useFindCaseUserActions } from '../../../containers/use_find_case_user_actions';
import { useGetCaseConnectors } from '../../../containers/use_get_case_connectors';
import { useGetCaseUsers } from '../../../containers/use_get_case_users';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { renderWithTestingProviders } from '../../../common/mock';
import type { CaseUserActionsStats } from '../../../containers/types';
import type { UserActivityParams } from '../../user_actions_activity_bar/types';

jest.mock('../../../containers/use_infinite_find_case_user_actions');
jest.mock('../../../containers/use_find_case_user_actions');
jest.mock('../../../containers/use_get_case_connectors');
jest.mock('../../../containers/use_get_case_users');
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../../common/lib/kibana');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ detailName: 'case-id' }),
}));

const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const userActionsStats: CaseUserActionsStats = {
  total: 5,
  totalDeletions: 0,
  totalComments: 2,
  totalCommentDeletions: 0,
  totalCommentCreations: 2,
  totalHiddenCommentUpdates: 0,
  totalOtherActions: 3,
  totalOtherActionDeletions: 0,
};

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const defaultProps = {
  data: basicCase,
  userActivityQueryParams,
  userActionsStats,
  statusActionButton: null,
  attachActionButton: null,
  onUpdateField: jest.fn(),
};

describe('UserActions (redesign)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseConnectorsMock.mockReturnValue({ data: getCaseConnectorsMockResponse() });
    useGetCaseUsersMock.mockReturnValue({ data: undefined });
    useGetCaseConfigurationMock.mockReturnValue({ data: casesConfigurationsMock });
    useGetCurrentUserProfileMock.mockReturnValue({ data: undefined });
    useInfiniteFindCaseUserActionsMock.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    });
    useFindCaseUserActionsMock.mockReturnValue({
      data: { userActions: [], latestAttachments: [] },
      isLoading: false,
    });
  });

  it('renders the user actions list when loaded', async () => {
    renderWithTestingProviders(<UserActions {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while data is loading', () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    });
    useFindCaseUserActionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderWithTestingProviders(<UserActions {...defaultProps} />);

    expect(screen.getByTestId('user-actions-loading')).toBeInTheDocument();
  });

  it('renders the comment list container', async () => {
    renderWithTestingProviders(<UserActions {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
    });
  });

  describe('no search results', () => {
    it('shows the empty prompt when a search filter has no matches', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: { pages: [{ userActions: [], latestAttachments: [], total: 0 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(
        <UserActions
          {...defaultProps}
          userActivityQueryParams={{ ...userActivityQueryParams, search: 'no matches' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-no-search-results')).toBeInTheDocument();
      });
      // The "add comment" UI (rendered via UserActionsList) must remain
      // usable even when the current filters match nothing.
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
    });

    it('shows the empty prompt when an author filter has no matches', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: { pages: [{ userActions: [], latestAttachments: [], total: 0 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(
        <UserActions
          {...defaultProps}
          userActivityQueryParams={{ ...userActivityQueryParams, authors: ['elastic'] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-no-search-results')).toBeInTheDocument();
      });
    });

    it('shows the empty prompt when filtering by type only has no matches', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: { pages: [{ userActions: [], latestAttachments: [], total: 0 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(
        <UserActions
          {...defaultProps}
          userActivityQueryParams={{ ...userActivityQueryParams, type: 'action' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-no-search-results')).toBeInTheDocument();
      });
    });

    it('does not show the empty prompt when there are matches', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: { pages: [{ userActions: [{ id: '1' }], latestAttachments: [], total: 1 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(
        <UserActions
          {...defaultProps}
          userActivityQueryParams={{ ...userActivityQueryParams, search: 'matches' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('user-actions-no-search-results')).not.toBeInTheDocument();
    });

    it('does not show the empty prompt when no filter is active, even with zero user actions', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: { pages: [{ userActions: [], latestAttachments: [], total: 0 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(<UserActions {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('user-actions-no-search-results')).not.toBeInTheDocument();
    });

    it('does not show the empty prompt while results are still loading', () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        data: undefined,
        isLoading: true,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      });

      renderWithTestingProviders(
        <UserActions
          {...defaultProps}
          userActivityQueryParams={{ ...userActivityQueryParams, search: 'no matches yet' }}
        />
      );

      expect(screen.queryByTestId('user-actions-no-search-results')).not.toBeInTheDocument();
    });
  });
});
