/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';
import { EXPERIMENTAL_DESC, EXPERIMENTAL_LABEL } from '../header_page/translations';
import { ACTIVITY_TAB, ALERTS_TAB, FILES_TAB } from './translations';
import type { CaseUI } from '../../../common';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';

const FilesTab = ({
  activeTab,
  fileStatsData,
  isLoading,
  euiTheme,
}: {
  activeTab: string;
  fileStatsData: { total: number } | undefined;
  isLoading: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {FILES_TAB}
    {!isLoading && fileStatsData && (
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-files-stats-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.FILES ? 'accent' : 'subdued'}
      >
        {fileStatsData.total > 0 ? fileStatsData.total : 0}
      </EuiNotificationBadge>
    )}
  </>
);

const AlertsTab = ({
  activeTab,
  totalAlerts,
  isExperimental,
  euiTheme,
}: {
  activeTab: string;
  totalAlerts: number | undefined;
  isExperimental: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {ALERTS_TAB}
    <EuiNotificationBadge
      css={css`
        margin-left: ${euiTheme.size.xs};
      `}
      data-test-subj="case-view-alerts-stats-badge"
      color={activeTab === CASE_VIEW_PAGE_TABS.ALERTS ? 'accent' : 'subdued'}
    >
      {totalAlerts || 0}
    </EuiNotificationBadge>
    {isExperimental && (
      <EuiBetaBadge
        label={EXPERIMENTAL_LABEL}
        size="s"
        iconType="beaker"
        tooltipContent={EXPERIMENTAL_DESC}
        tooltipPosition="bottom"
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-alerts-table-experimental-badge"
      />
    )}
  </>
);

FilesTab.displayName = 'FilesTab';
AlertsTab.displayName = 'AlertsTab';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { features } = useCasesContext();
  const { navigateToCaseView } = useCaseViewNavigation();
  const { euiTheme } = useEuiTheme();
  const { data: fileStatsData, isLoading } = useGetCaseFileStats({
    caseId: caseData.id,
  });

  const tabs = useMemo(
    () => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        name: ACTIVITY_TAB,
      },
      ...(features.alerts.enabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.ALERTS,
              name: (
                <AlertsTab
                  isExperimental={features.alerts.isExperimental}
                  totalAlerts={caseData.totalAlerts}
                  activeTab={activeTab}
                  euiTheme={euiTheme}
                />
              ),
            },
          ]
        : []),
      {
        id: CASE_VIEW_PAGE_TABS.FILES,
        name: (
          <FilesTab
            isLoading={isLoading}
            fileStatsData={fileStatsData}
            activeTab={activeTab}
            euiTheme={euiTheme}
          />
        ),
      },
    ],
    [
      features.alerts.enabled,
      features.alerts.isExperimental,
      caseData.totalAlerts,
      activeTab,
      isLoading,
      fileStatsData,
      euiTheme,
    ]
  );

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() => navigateToCaseView({ detailName: caseData.id, tabId: tab.id })}
        isSelected={tab.id === activeTab}
      >
        {tab.name}
      </EuiTab>
    ));
  }, [activeTab, caseData.id, navigateToCaseView, tabs]);

  return (
    <>
      <EuiTabs data-test-subj="case-view-tabs">{renderTabs()}</EuiTabs>
      <EuiSpacer size="l" />
    </>
  );
});
CaseViewTabs.displayName = 'CaseViewTabs';
