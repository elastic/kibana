/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCasesContext } from '../cases_context/use_cases_context';
import { ALERTS_TAB, EVENTS_TAB, FILES_TAB, OBSERVABLES_TAB } from './translations';
import { type CaseUI } from '../../../common';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';
import { useCaseObservables } from './use_case_observables';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import { useCasesFeatures } from '../../common/use_cases_features';
import { AttachmentType } from '../../../common/types/domain';

const FilesBadge = ({
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

FilesBadge.displayName = 'FilesBadge';

const ObservablesBadge = ({
  activeTab,
  isLoading,
  euiTheme,
  count,
}: {
  activeTab: string;
  count: number;
  isLoading: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {!isLoading && (
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-observables-stats-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.OBSERVABLES ? 'accent' : 'subdued'}
      >
        {count}
      </EuiNotificationBadge>
    )}
  </>
);

ObservablesBadge.displayName = 'ObservablesBadge';

export const SimilarCasesBadge = ({
  activeTab,
  count,
  euiTheme,
}: {
  activeTab: string;
  count?: number;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-similar-cases-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.SIMILAR_CASES ? 'accent' : 'subdued'}
      >
        {count ?? 0}
      </EuiNotificationBadge>
    }
  </>
);

SimilarCasesBadge.displayName = 'SimilarCasesBadge';

export const AttachmentsBadge = ({
  isActive,
  count,
  euiTheme,
}: {
  isActive: boolean;
  count?: number;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-attachments-badge"
        color={isActive ? 'accent' : 'subdued'}
      >
        {count ?? 0}
      </EuiNotificationBadge>
    }
  </>
);

AttachmentsBadge.displayName = 'AttachmentsBadge';

const AlertsBadge = ({
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
      <ExperimentalBadge compact data-test-subj="case-view-alerts-table-experimental-badge" />
    )}
  </>
);

AlertsBadge.displayName = 'AlertsBadge';

const EventsBadge = ({
  activeTab,
  totalEvents,
  euiTheme,
}: {
  activeTab: string;
  totalEvents: number | undefined;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <EuiNotificationBadge
    css={css`
      margin-left: ${euiTheme.size.xs};
    `}
    data-test-subj="case-view-events-stats-badge"
    color={activeTab === CASE_VIEW_PAGE_TABS.EVENTS ? 'accent' : 'subdued'}
  >
    {totalEvents || 0}
  </EuiNotificationBadge>
);

EventsBadge.displayName = 'EventsBadge';

export interface CaseViewTab {
  badge?: ReactNode;
  id: CASE_VIEW_PAGE_TABS;
  name: string;
}

export interface UseCaseAttachmentTabsReturnValue {
  tabs: CaseViewTab[];
  totalAttachments: number;
}

export const useCaseAttachmentTabs = ({
  caseData,
  activeTab,
  searchTerm,
}: {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
  searchTerm?: string;
}): UseCaseAttachmentTabsReturnValue => {
  const { features } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const { data: fileStatsData, isLoading: isLoadingFiles } = useGetCaseFileStats({
    caseId: caseData.id,
    searchTerm,
  });
  const { observables, isLoading: isLoadingObservables } = useCaseObservables(caseData, searchTerm);
  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  const stats = useMemo(() => {
    if (!searchTerm) {
      return {
        totalAlerts: Number(caseData.totalAlerts),
        totalEvents: Number(caseData.totalEvents),
      };
    }
    return caseData.comments.reduce(
      (acc, comment) => {
        if (comment.type === AttachmentType.alert && features.alerts.enabled) {
          acc.totalAlerts = Array.isArray(comment.alertId)
            ? acc.totalAlerts + comment.alertId.length
            : acc.totalAlerts + 1;
        } else if (comment.type === AttachmentType.event && features.events.enabled) {
          acc.totalEvents = Array.isArray(comment.eventId)
            ? acc.totalEvents + comment.eventId.length
            : acc.totalEvents + 1;
        }
        return acc;
      },
      { totalEvents: 0, totalAlerts: 0 }
    );
  }, [searchTerm, features, caseData]);

  const totalAttachments =
    stats.totalAlerts +
    stats.totalEvents +
    Number(fileStatsData?.total) +
    (canShowObservableTabs && isObservablesFeatureEnabled ? observables.length : 0);

  const tabsConfig = useMemo(
    () => [
      ...(features.alerts.enabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.ALERTS,
              name: ALERTS_TAB,
              badge: (
                <AlertsBadge
                  isExperimental={features.alerts.isExperimental}
                  totalAlerts={stats.totalAlerts}
                  activeTab={activeTab}
                  euiTheme={euiTheme}
                />
              ),
            },
          ]
        : []),
      ...(features.events.enabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.EVENTS,
              name: EVENTS_TAB,
              badge: (
                <EventsBadge
                  totalEvents={stats.totalEvents}
                  activeTab={activeTab}
                  euiTheme={euiTheme}
                />
              ),
            },
          ]
        : []),
      {
        id: CASE_VIEW_PAGE_TABS.FILES,
        name: FILES_TAB,
        badge: (
          <FilesBadge
            isLoading={isLoadingFiles}
            fileStatsData={fileStatsData}
            activeTab={activeTab}
            euiTheme={euiTheme}
          />
        ),
      },
      ...(canShowObservableTabs && isObservablesFeatureEnabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.OBSERVABLES,
              name: OBSERVABLES_TAB,
              badge: (
                <ObservablesBadge
                  isLoading={isLoadingObservables}
                  count={observables.length}
                  activeTab={activeTab}
                  euiTheme={euiTheme}
                />
              ),
            },
          ]
        : []),
    ],
    [
      activeTab,
      canShowObservableTabs,
      stats.totalAlerts,
      stats.totalEvents,
      euiTheme,
      features.alerts.enabled,
      features.alerts.isExperimental,
      features.events.enabled,
      fileStatsData,
      isLoadingFiles,
      isLoadingObservables,
      isObservablesFeatureEnabled,
      observables.length,
    ]
  );

  return { tabs: tabsConfig, totalAttachments };
};
