/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, fireEvent, screen } from '@testing-library/react';
import type { RecentCasesProps } from '.';
import RecentCases from '.';

import {
  allCasesCapabilities,
  noCasesCapabilities,
  renderWithTestingProviders,
} from '../../common/mock';
import { useGetCasesMockState } from '../../containers/mock';
import { useCurrentUser } from '../../common/lib/kibana/hooks';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/use_get_cases');
jest.mock('../../common/lib/kibana/hooks');
jest.mock('../../common/navigation/hooks');

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
  });

  it('shows a loading status', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...mockData,
      isLoading: true,
    }));

    renderWithTestingProviders(<RecentCases {...defaultProps} />);

    expect(screen.getAllByTestId('loadingPlaceholders')).toHaveLength(3);
  });

  it('render cases', () => {
    renderWithTestingProviders(<RecentCases {...defaultProps} />);
    expect(screen.getAllByTestId('case-details-link')).toHaveLength(8);
  });

  it('render max cases correctly', () => {
    renderWithTestingProviders(<RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 2 },
    });
  });

  it('render formatted date correctly', async () => {
    renderWithTestingProviders(<RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 2 },
    });

    await waitFor(() =>
      expect(screen.getAllByTestId('recent-cases-creation-relative-time')).toHaveLength(8)
    );
  });

  it('sets the reporter filters correctly', async () => {
    renderWithTestingProviders(<RecentCases {...defaultProps} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

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

    renderWithTestingProviders(<RecentCases {...defaultProps} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

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
    renderWithTestingProviders(<RecentCases {...defaultProps} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

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

    renderWithTestingProviders(<RecentCases {...defaultProps} />);

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['securitySolution'] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const recentCasesFilter = screen.getByTestId('recent-cases-filter');

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
    const coreStart = coreMock.createStart();
    /**
     * We set securitySolutionCasesV2 capability to not have
     * any access to cases. This tests that we get the owners
     * that have at least read access.
     */
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      generalCasesV3: allCasesCapabilities(),
      securitySolutionCasesV2: noCasesCapabilities(),
    };

    renderWithTestingProviders(<RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />, {
      wrapperProps: { owner: [], coreStart },
    });

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [], owner: ['cases'] },
      queryParams: { perPage: 2 },
    });
  });
});
