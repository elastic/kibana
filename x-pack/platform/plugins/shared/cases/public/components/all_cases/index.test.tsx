/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { AllCases } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noCreateCasesPermissions } from '../../common/mock';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { connectorsMock, useGetCasesMockState } from '../../containers/mock';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_categories');
jest.mock('../../containers/use_get_action_license', () => {
  return {
    useGetActionLicense: jest.fn(),
  };
});
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/api');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../api');

const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetActionLicenseMock = useGetActionLicense as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

describe('AllCases', () => {
  const refetchCases = jest.fn();
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();

  const defaultGetCases = {
    ...useGetCasesMockState,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };

  const defaultActionLicense = {
    data: null,
    isLoading: false,
    isError: false,
  };

  beforeAll(() => {
    jest.useFakeTimers();
    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
    (useGetCategories as jest.Mock).mockReturnValue({
      data: ['beverages', 'snacks'],
      refetch: jest.fn(),
    });
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));
    useGetActionLicenseMock.mockReturnValue(defaultActionLicense);
    useGetCasesMock.mockReturnValue(defaultGetCases);

    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/162852
  describe.skip('empty table', () => {
    beforeEach(() => {
      useGetCasesMock.mockReturnValue({
        ...defaultGetCases,
        data: {
          ...defaultGetCases.data,
          cases: [],
          total: 0,
        },
      });
    });

    it('should render the create new case link when the user has create privileges', async () => {
      const result = appMockRender.render(<AllCases />);
      await waitFor(() => {
        expect(result.getByTestId('cases-table-add-case')).toBeInTheDocument();
      });
    });

    it('should not render the create new case link when the user does not have create privileges', async () => {
      appMockRender = createAppMockRenderer({ permissions: noCreateCasesPermissions() });
      const result = appMockRender.render(<AllCases />);
      await waitFor(() => {
        expect(result.queryByTestId('cases-table-add-case')).not.toBeInTheDocument();
      });
    });
  });

  it('should render the stats', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
    });

    const result = appMockRender.render(<AllCases />);

    await waitFor(() => {
      expect(result.getByTestId('openStatsHeader')).toBeInTheDocument();
      expect(result.getByText('20')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(result.getByTestId('inProgressStatsHeader')).toBeInTheDocument();
      expect(result.getByText('40')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(result.getByTestId('closedStatsHeader')).toBeInTheDocument();
      expect(result.getByText('130')).toBeInTheDocument();
    });
  });

  it('should render the loading spinner when loading stats', async () => {
    const result = appMockRender.render(<AllCases />);

    await waitFor(() => {
      expect(result.getByTestId('openStatsHeader-loading-spinner')).toBeInTheDocument();
      expect(result.getByTestId('inProgressStatsHeader-loading-spinner')).toBeInTheDocument();
      expect(result.getByTestId('closedStatsHeader-loading-spinner')).toBeInTheDocument();
    });
  });

  it('should render the case callouts', async () => {
    const result = appMockRender.render(<AllCases />);
    await waitFor(() => {
      expect(result.getByTestId('case-callouts')).toBeInTheDocument();
    });
  });
});
