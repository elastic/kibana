/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { caseData } from './mocks';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import type { CaseViewTabsProps } from './case_view_tabs';
import { useCaseAttachmentTabs } from './use_case_attachment_tabs';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import React from 'react';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

import { useCaseObservables } from './use_case_observables';

jest.mock('./use_case_observables', () => ({
  useCaseObservables: () => ({
    observables: [],
    isLoading: false,
  }),
}));

const useGetCaseObservablesMock = jest.mocked(useCaseObservables);

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

describe('useCaseAttachmentTabs()', () => {
  it('returns basic case attachment tabs', async () => {
    const { result } = renderHook(
      () => {
        return useCaseAttachmentTabs({ caseData, activeTab: CASE_VIEW_PAGE_TABS.ALERTS });
      },
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(result.current.map((tab) => tab.id)).toMatchInlineSnapshot(`
      Array [
        "alerts",
        "files",
      ]
    `);
  });

  it('returns attachment tabs based on enable features an license', async () => {
    const { result } = renderHook(
      () => {
        return useCaseAttachmentTabs({ caseData, activeTab: CASE_VIEW_PAGE_TABS.ALERTS });
      },
      {
        wrapper: ({ children }) => (
          <TestProviders
            features={{
              alerts: { enabled: true },
              events: { enabled: true },
              observables: { enabled: true },
            }}
            license={platinumLicense}
          >
            {children}
          </TestProviders>
        ),
      }
    );

    expect(result.current.map((tab) => tab.id)).toMatchInlineSnapshot(`
      Array [
        "alerts",
        "events",
        "files",
        "observables",
      ]
    `);
  });
});

//
// it('shows the files tab as active', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tab-title-files')).toHaveAttribute(
//     'aria-selected',
//     'true'
//   );
// });
//
// it('shows the events tab as active', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tab-title-events')).toHaveAttribute(
//     'aria-selected',
//     'true'
//   );
// });
// it('shows the files tab with the correct count', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   const badge = await screen.findByTestId('case-view-files-stats-badge');
//
//   expect(badge).toHaveTextContent('3');
// });
//
// it('do not show count on the files tab if the call isLoading', async () => {
//   useGetCaseFileStatsMock.mockReturnValue({ isLoading: true, data });
//
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   expect(screen.queryByTestId('case-view-files-stats-badge')).not.toBeInTheDocument();
// });
//
// it('shows the alerts tab with the correct count', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   const badge = await screen.findByTestId('case-view-alerts-stats-badge');
//
//   expect(badge).toHaveTextContent('3');
// });
//
// it('the alerts tab count has a different color if the tab is not active', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.FILES} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   expect(
//     (await screen.findByTestId('case-view-alerts-stats-badge')).getAttribute('class')
//   ).not.toMatch(/accent/);
// });
// it('navigates to the alerts tab when the alerts tab is clicked', async () => {
//   const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
//   renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
//     wrapperProps: { license: basicLicense },
//   });
//
//   await userEvent.click(await screen.findByTestId('case-view-tab-title-alerts'));
//
//   await waitFor(() => {
//     expect(navigateToCaseViewMock).toHaveBeenCalledWith({
//       detailName: caseData.id,
//       tabId: CASE_VIEW_PAGE_TABS.ALERTS,
//     });
//   });
// });
//
// it('navigates to the files tab when the files tab is clicked', async () => {
//   const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
//   renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
//     wrapperProps: { license: basicLicense },
//   });
//
//   await userEvent.click(await screen.findByTestId('case-view-tab-title-files'));
//
//   await waitFor(() => {
//     expect(navigateToCaseViewMock).toHaveBeenCalledWith({
//       detailName: caseData.id,
//       tabId: CASE_VIEW_PAGE_TABS.FILES,
//     });
//   });
// });
//
// it('navigates to the events tab when the events tab is clicked', async () => {
//   const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
//   renderWithTestingProviders(<CaseViewTabs {...caseProps} />, {
//     wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
//   });
//
//   await userEvent.click(await screen.findByTestId('case-view-tab-title-events'));
//
//   await waitFor(() => {
//     expect(navigateToCaseViewMock).toHaveBeenCalledWith({
//       detailName: caseData.id,
//       tabId: CASE_VIEW_PAGE_TABS.EVENTS,
//     });
//   });
// });
// it('should display the alerts tab when the feature is enabled', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { alerts: { enabled: true } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
// });
//
// it('should not display the alerts tab when the feature is disabled', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { alerts: { enabled: false } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
//   expect(screen.queryByTestId('case-view-tab-title-alerts')).not.toBeInTheDocument();
// });
//
// it('should not show the experimental badge on the alerts table', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { alerts: { isExperimental: false } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
//   expect(
//     screen.queryByTestId('case-view-alerts-table-experimental-badge')
//   ).not.toBeInTheDocument();
// });
//
// it('should show the experimental badge on the alerts table', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { alerts: { isExperimental: true } } },
//     }
//   );
//
//   expect(
//     await screen.findByTestId('case-view-alerts-table-experimental-badge')
//   ).toBeInTheDocument();
// });
//
// it('should display the events tab with correct count when the feature is enabled', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithEvents} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { events: { enabled: true } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tab-title-events')).toBeInTheDocument();
//
//   const badge = await screen.findByTestId('case-view-events-stats-badge');
//
//   expect(badge).toHaveTextContent('4');
// });
//
// it('should not display the events tab when the feature is disabled', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithEvents} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />,
//     {
//       wrapperProps: { license: basicLicense, features: { events: { enabled: false } } },
//     }
//   );
//
//   expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
//   expect(screen.queryByTestId('case-view-tab-title-events')).not.toBeInTheDocument();
// });
//
// it('should not show observable tabs in non-platinum tiers', async () => {
//   const spyOnUseGetSimilarCases = jest.spyOn(similarCasesHook, 'useGetSimilarCases');
//
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
//     {
//       wrapperProps: { license: basicLicense },
//     }
//   );
//
//   expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
//   expect(screen.queryByTestId('case-view-tab-title-similar_cases')).not.toBeInTheDocument();
//
//   // NOTE: we are still calling the hook but the fetching is disabled (based on the license)
//   expect(spyOnUseGetSimilarCases).toHaveBeenLastCalledWith(
//     expect.objectContaining({ enabled: false })
//   );
// });
//
// it('should not show observable tabs if the observables feature is not enabled', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />,
//     {
//       wrapperProps: {
//         license: basicLicense,
//         features: { observables: { enabled: false, autoExtract: false } },
//       },
//     }
//   );
//
//   expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
//   expect(screen.queryByTestId('case-view-tab-title-similar_cases')).not.toBeInTheDocument();
// });
//
//   it('should show observable tabs in platinum+ tiers', async () => {
//     const spyOnUseGetSimilarCases = jest.spyOn(similarCasesHook, 'useGetSimilarCases');
//
//     renderWithTestingProviders(
//       <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
//       {
//         wrapperProps: { license: platinumLicense },
//       }
//     );
//
//     // NOTE: ensure we are calling the hook but the fetching is enabled (based on the license)
//     expect(spyOnUseGetSimilarCases).toHaveBeenLastCalledWith(
//       expect.objectContaining({ enabled: true })
//     );
//   });
//
//   it('should show the observables tab', async () => {
//     renderWithTestingProviders(
//       <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
//       {
//         wrapperProps: { license: platinumLicense },
//       }
//     );
//
//     expect(await screen.findByTestId('case-view-tab-title-observables')).toBeInTheDocument();
//   });
// it('shows the observables tab with the correct count', async () => {
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
//     {
//       wrapperProps: { license: platinumLicense },
//     }
//   );
//
//   const badge = await screen.findByTestId('case-view-observables-stats-badge');
//
//   expect(badge).toHaveTextContent('0');
// });
//
// it('do not show count on the observables tab if the call isLoading', async () => {
//   useGetCaseObservablesMock.mockReturnValue({ isLoading: true, observables: [] });
//
//   renderWithTestingProviders(
//     <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />,
//     {
//       wrapperProps: { license: platinumLicense },
//     }
//   );
//
//   expect(screen.queryByTestId('case-view-observables-stats-badge')).not.toBeInTheDocument();
