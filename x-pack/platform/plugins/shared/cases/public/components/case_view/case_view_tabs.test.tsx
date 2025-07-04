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
import * as similarCasesHook from '../../containers/use_get_similar_cases';

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
      wrapperProps: { license: basicLicense },
    });

    expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-files')).toBeInTheDocument();
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

  it('shows the alerts tab as active', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-alerts')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the files tab as active', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-files')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the files tab with the correct count', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    const badge = await screen.findByTestId('case-view-files-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('do not show count on the files tab if the call isLoading', async () => {
    useGetCaseFileStatsMock.mockReturnValue({ isLoading: true, data });

    renderWithTestingProviders(
      <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(screen.queryByTestId('case-view-files-stats-badge')).not.toBeInTheDocument();
  });

  it('shows the alerts tab with the correct count', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    const badge = await screen.findByTestId('case-view-alerts-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('the alerts tab count has a different color if the tab is not active', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(
      (await screen.findByTestId('case-view-alerts-stats-badge')).getAttribute('class')
    ).not.toMatch(/accent/);
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

  it('navigates to the alerts tab when the alerts tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
      wrapperProps: { license: basicLicense },
    });

    await userEvent.click(await screen.findByTestId('case-view-tab-title-alerts'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });
    });
  });

  it('navigates to the files tab when the files tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
      wrapperProps: { license: basicLicense },
    });

    await userEvent.click(await screen.findByTestId('case-view-tab-title-files'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.FILES,
      });
    });
  });

  it('should display the alerts tab when the feature is enabled', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { enabled: true } } },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
  });

  it('should not display the alerts tab when the feature is disabled', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { enabled: false } } },
      }
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-alerts')).not.toBeInTheDocument();
  });

  it('should not show the experimental badge on the alerts table', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { isExperimental: false } } },
      }
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(
      screen.queryByTestId('case-view-alerts-table-experimental-badge')
    ).not.toBeInTheDocument();
  });

  it('should show the experimental badge on the alerts table', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { isExperimental: true } } },
      }
    );

    expect(
      await screen.findByTestId('case-view-alerts-table-experimental-badge')
    ).toBeInTheDocument();
  });

  it('should not show observable tabs in non-platinum tiers', async () => {
    const spyOnUseGetSimilarCases = jest.spyOn(similarCasesHook, 'useGetSimilarCases');

    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-similar_cases')).not.toBeInTheDocument();

    // NOTE: we are still calling the hook but the fetching is disabled (based on the license)
    expect(spyOnUseGetSimilarCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('should not show observable tabs if the observables feature is not enabled', async () => {
    renderWithTestingProviders(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
      {
        wrapperProps: { license: basicLicense, features: { observables: { enabled: false } } },
      }
    );

    expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-similar_cases')).not.toBeInTheDocument();
  });

  describe('show observable tabs in platinum tier or higher', () => {
    const platinumLicense = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    it('should show observable tabs in platinum+ tiers', async () => {
      const spyOnUseGetSimilarCases = jest.spyOn(similarCasesHook, 'useGetSimilarCases');

      renderWithTestingProviders(
        <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      // NOTE: ensure we are calling the hook but the fetching is enabled (based on the license)
      expect(spyOnUseGetSimilarCases).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it('should show the observables tab', async () => {
      renderWithTestingProviders(
        <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      expect(await screen.findByTestId('case-view-tab-title-observables')).toBeInTheDocument();
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

    it('shows the observables tab with the correct count', async () => {
      renderWithTestingProviders(
        <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      const badge = await screen.findByTestId('case-view-observables-stats-badge');

      expect(badge).toHaveTextContent('0');
    });

    it('do not show count on the observables tab if the call isLoading', async () => {
      useGetCaseObservablesMock.mockReturnValue({ isLoading: true, observables: [] });

      renderWithTestingProviders(
        <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      expect(screen.queryByTestId('case-view-observables-stats-badge')).not.toBeInTheDocument();
    });
  });
});
