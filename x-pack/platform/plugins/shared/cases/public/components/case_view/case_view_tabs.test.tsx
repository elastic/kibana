/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import type { UseGetCase } from '../../containers/use_get_case';
import type { CaseViewTabsProps } from './case_view_tabs';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { renderWithTestingProviders } from '../../common/mock';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetCase } from '../../containers/use_get_case';
import { CaseViewTabs } from './case_view_tabs';
import { caseData, defaultGetCase } from './mocks';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';
import { useCaseObservables } from './use_case_observables';

jest.mock('../../containers/use_get_case');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../../containers/use_get_case_file_stats');
jest.mock('./use_case_observables');

const useFetchCaseMock = useGetCase as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useGetCaseFileStatsMock = useGetCaseFileStats as jest.Mock;
const useGetCaseObservablesMock = useCaseObservables as jest.Mock;

const mockGetCase = (props: Partial<UseGetCase> = {}) => {
  const data = {
    ...defaultGetCase.data,
    ...props.data,
  };
  useFetchCaseMock.mockReturnValue({
    ...defaultGetCase,
    ...props,
    data,
  });
};

export const caseProps: CaseViewTabsProps = {
  caseData,
  activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY,
};

export const casePropsWithAlerts: CaseViewTabsProps = {
  ...caseProps,
  caseData: { ...caseData, totalAlerts: 3 },
};

export const casePropsWithEvents: CaseViewTabsProps = {
  ...caseProps,
  caseData: { ...caseData, totalEvents: 4 },
};

describe('CaseViewTabs', () => {
  const data = { total: 3 };
  const basicLicense = licensingMock.createLicense({
    license: { type: 'basic' },
  });

  beforeEach(() => {
    useGetCaseObservablesMock.mockReturnValue({ isLoading: false, observables: [] });
    useGetCaseFileStatsMock.mockReturnValue({ data });
    mockGetCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render CaseViewTabs', async () => {
    const props = { activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY, caseData };
    renderWithTestingProviders(<CaseViewTabs {...props} />, {
      wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
    });

    expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-attachments')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-similar_cases')).toBeInTheDocument();
  });

  it('renders the activity tab by default', async () => {
    renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
      wrapperProps: { license: basicLicense },
    });

    expect(await screen.findByTestId('case-view-tab-title-activity')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('navigates to the activity tab when the activity tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
      wrapperProps: { license: basicLicense },
    });

    await userEvent.click(await screen.findByTestId('case-view-tab-title-activity'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
      });
    });
  });

  describe('show observable tabs in platinum tier or higher', () => {
    const platinumLicense = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    it('should show the similar cases tab', async () => {
      renderWithTestingProviders(
        <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.SIMILAR_CASES} />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      expect(await screen.findByTestId('case-view-tab-title-similar_cases')).toBeInTheDocument();
    });

    it('navigates to the similar cases tab when the similar cases tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
        wrapperProps: { license: platinumLicense },
      });

      await userEvent.click(await screen.findByTestId('case-view-tab-title-similar_cases'));

      await waitFor(() => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        });
      });
    });
  });
});
