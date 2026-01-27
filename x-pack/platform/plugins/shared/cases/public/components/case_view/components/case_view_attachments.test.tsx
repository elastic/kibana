/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { alertCommentWithIndices, eventComment, basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';
import { renderWithTestingProviders } from '../../../common/mock';
import { CaseViewAttachments } from './case_view_attachments';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { screen, waitFor } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { useGetCaseFileStats } from '../../../containers/use_get_case_file_stats';
import userEvent from '@testing-library/user-event';
import { useCaseViewNavigation } from '../../../common/navigation';
import * as similarCasesHook from '../../../containers/use_get_similar_cases';
import { useCaseObservables } from '../use_case_observables';

jest.mock('../../../containers/use_get_case_file_stats');
jest.mock('../../../common/navigation/hooks');
jest.mock('../use_case_observables', () => ({
  useCaseObservables: jest.fn(() => ({ observables: [], isLoading: false })),
}));

const useGetCaseFileStatsMock = useGetCaseFileStats as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useGetCaseObservablesMock = useCaseObservables as jest.Mock;

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

const basicLicense = licensingMock.createLicense({
  license: { type: 'basic' },
});

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

const fileStatsData = { total: 3 };
const onSearchMock = jest.fn();

describe('Case View Attachments tab', () => {
  beforeEach(() => {
    useGetCaseFileStatsMock.mockReturnValue({ data: fileStatsData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the case view attachments tab', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />
    );

    expect(screen.getByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('cases-files-search')).toBeInTheDocument();
  });

  it('should call the onSearch callback when the search field is changed', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />
    );

    await userEvent.type(screen.getByTestId('cases-files-search'), 'search{Enter}');

    await waitFor(() => {
      expect(onSearchMock).toHaveBeenCalledWith('search');
    });
  });

  it('shows the files tab as active', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.FILES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-files')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the events tab as active', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.EVENTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-events')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the files tab with the correct count', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.FILES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    const badge = await screen.findByTestId('case-view-files-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('do not show count on the files tab if the call isLoading', async () => {
    useGetCaseFileStatsMock.mockReturnValue({ isLoading: true, data: fileStatsData });

    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.FILES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(screen.queryByTestId('case-view-files-stats-badge')).not.toBeInTheDocument();
  });

  it('shows the alerts tab based on totalAlerts when search is not applied', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={{ ...caseData, totalAlerts: 3 }}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    const badge = await screen.findByTestId('case-view-alerts-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('shows the alerts tab based on alert comment count when search is applied', async () => {
    const alerts = Array.from({ length: 3 }, (_, i) => ({
      ...alertCommentWithIndices,
      id: `alert-${i}`,
    }));
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={{ ...caseData, totalAlerts: 5, comments: alerts }}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
        searchTerm="search"
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    const badge = await screen.findByTestId('case-view-alerts-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('the alerts tab count has a different color if the tab is not active', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={{ ...caseData, totalAlerts: 3 }}
        activeTab={CASE_VIEW_PAGE_TABS.FILES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(
      (await screen.findByTestId('case-view-alerts-stats-badge')).getAttribute('class')
    ).not.toMatch(/accent/);
  });

  it('navigates to the alerts tab when the alerts tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

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
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    await userEvent.click(await screen.findByTestId('case-view-tab-title-files'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.FILES,
      });
    });
  });

  it('navigates to the events tab when the events tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
      }
    );

    await userEvent.click(await screen.findByTestId('case-view-tab-title-events'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.EVENTS,
      });
    });
  });

  it('should display the alerts tab when the feature is enabled', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { enabled: true } } },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
  });

  it('should not display the alerts tab when the feature is disabled', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { enabled: false } } },
      }
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-alerts')).not.toBeInTheDocument();
  });

  it('should not show the experimental badge on the alerts table', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
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
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { alerts: { isExperimental: true } } },
      }
    );

    expect(
      await screen.findByTestId('case-view-alerts-table-experimental-badge')
    ).toBeInTheDocument();
  });

  it('should display the events tab based on totalEvents when the feature is enabled and search is not applied', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={{ ...caseData, totalEvents: 4 }}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-events')).toBeInTheDocument();

    const badge = await screen.findByTestId('case-view-events-stats-badge');
    expect(badge).toHaveTextContent('4');
  });

  it('should display the events tab with correct count when the feature is enabled', async () => {
    const events = Array.from({ length: 2 }, (_, i) => ({
      ...eventComment,
      id: `event-${i}`,
    }));
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={{ ...caseData, totalEvents: 4, comments: events }}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
        searchTerm="search"
      />,
      {
        wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-events')).toBeInTheDocument();

    const badge = await screen.findByTestId('case-view-events-stats-badge');
    expect(badge).toHaveTextContent('2');
  });

  it('should not display the events tab when the feature is disabled', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense, features: { events: { enabled: false } } },
      }
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-events')).not.toBeInTheDocument();
  });

  it('should not show observable tabs in non-platinum tiers', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: basicLicense },
      }
    );

    expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
  });

  it('should not show observable tabs if the observables feature is not enabled', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ALERTS}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: {
          license: basicLicense,
          features: { observables: { enabled: false, autoExtract: false } },
        },
      }
    );

    expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
  });

  it('should show observable tabs in platinum+ tiers', async () => {
    const spyOnUseGetSimilarCases = jest.spyOn(similarCasesHook, 'useGetSimilarCases');

    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES}
        onSearch={onSearchMock}
      />,
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
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: platinumLicense },
      }
    );

    expect(await screen.findByTestId('case-view-tab-title-observables')).toBeInTheDocument();
  });
  it('shows the observables tab with the correct count', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES}
        onSearch={onSearchMock}
      />,
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
      <CaseViewAttachments
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES}
        onSearch={onSearchMock}
      />,
      {
        wrapperProps: { license: platinumLicense },
      }
    );

    expect(screen.queryByTestId('case-view-observables-stats-badge')).not.toBeInTheDocument();
  });
});
