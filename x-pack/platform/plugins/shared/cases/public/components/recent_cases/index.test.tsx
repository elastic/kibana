/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure, waitFor, fireEvent } from '@testing-library/react';
import type { RecentCasesProps } from '.';
import RecentCases from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noCasesCapabilities, TestProviders } from '../../common/mock';
import { useGetCasesMockState } from '../../containers/mock';
import { useCurrentUser } from '../../common/lib/kibana/hooks';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/use_get_cases');
jest.mock('../../common/lib/kibana/hooks');
jest.mock('../../common/navigation/hooks');

configure({ testIdAttribute: 'data-test-subj' });
const defaultProps: RecentCasesProps = {
  maxCasesToShow: 10,
};

const mockData = {
  ...useGetCasesMockState,
};

const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useCurrentUserMock = useCurrentUser as jest.Mock;

describe('RecentCases', () => {
  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCurrentUserProfileMock.mockReturnValue({
      data: userProfiles[0],
      isLoading: false,
    });
    useGetCasesMock.mockImplementation(() => mockData);
    useCurrentUserMock.mockReturnValue({
      email: 'elastic@elastic.co',
      fullName: 'Elastic',
      username: 'elastic',
    });

    appMockRender = createAppMockRenderer();
  });

  it('shows a loading status', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...mockData,
      isLoading: true,
    }));

    const { getAllByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('loadingPlaceholders')).toHaveLength(3);
  });

  it('render cases', () => {
    const { getAllByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('case-details-link')).toHaveLength(8);
  });

  it('render max cases correctly', () => {
    appMockRender.render(
      <TestProviders>
        <RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />
      </TestProviders>
    );
    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 2 },
    });
  });

  it('render formatted date correctly', async () => {
    const result = appMockRender.render(
      <TestProviders>
        <RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />
      </TestProviders>
    );
    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 2 },
    });

    await waitFor(() =>
      expect(result.getAllByTestId('recent-cases-creation-relative-time')).toHaveLength(8)
    );
  });

  it('sets the reporter filters correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = getByTestId('recent-cases-filter');

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyReported' } });

    await waitFor(() =>
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          reporters: [
            {
              email: 'damaged_raccoon@elastic.co',
              full_name: 'Damaged Raccoon',
              profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
              username: 'damaged_raccoon',
            },
          ],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      })
    );

    // remove the filter
    fireEvent.change(recentCasesFilter, { target: { value: 'recentlyCreated' } });

    await waitFor(() =>
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          reporters: [],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      })
    );
  });

  it('sets the reporter filters to the user info without the profile uid when it cannot find the current user profile', async () => {
    useGetCurrentUserProfileMock.mockReturnValue({ data: undefined, isLoading: false });

    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = getByTestId('recent-cases-filter');

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyReported' } });

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          reporters: [
            {
              email: 'elastic@elastic.co',
              full_name: 'Elastic',
              username: 'elastic',
            },
          ],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      });
    });
  });

  it('sets the assignees filters correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = getByTestId('recent-cases-filter');

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyAssigned' } });

    await waitFor(() =>
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          assignees: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      })
    );

    // remove the filter
    fireEvent.change(recentCasesFilter, { target: { value: 'recentlyCreated' } });

    await waitFor(() =>
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          reporters: [],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      })
    );
  });

  it('sets empty assignees filter when no profile uid available', async () => {
    useGetCurrentUserProfileMock.mockReturnValue({ data: undefined, isLoading: false });

    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = getByTestId('recent-cases-filter');

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyAssigned' } });

    await waitFor(() =>
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          assignees: [],
          owner: ['securitySolution'],
        },
        queryParams: { perPage: 10 },
      })
    );
  });

  it('sets all available solutions correctly', () => {
    appMockRender = createAppMockRenderer({ owner: [] });
    /**
     * We set securitySolutionCasesV2 capability to not have
     * any access to cases. This tests that we get the owners
     * that have at least read access.
     */
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      securitySolutionCasesV2: noCasesCapabilities(),
    };

    appMockRender.render(<RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['cases'] },
      queryParams: { perPage: 2 },
    });
  });
});
