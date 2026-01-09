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
import { ALERTS_TAB, EVENTS_TAB, FILES_TAB, OBSERVABLES_TAB, ATTACK_DISCOVERIES_TAB } from './translations';
import { type CaseUI } from '../../../common';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';
import { useCaseObservables } from './use_case_observables';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import { useCasesFeatures } from '../../common/use_cases_features';
import { AttachmentType } from '../../../common/types/domain';
import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../common/constants';

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
}) => {
  const displayCount = count != null && !isNaN(count) ? count : 0;
  return (
    <>
      {
        <EuiNotificationBadge
          css={css`
            margin-left: ${euiTheme.size.xs};
          `}
          data-test-subj="case-view-attachments-badge"
          color={isActive ? 'accent' : 'subdued'}
        >
          {displayCount}
        </EuiNotificationBadge>
      }
    </>
  );
};

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
}: {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}): UseCaseAttachmentTabsReturnValue => {
  const { features } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const { data: fileStatsData, isLoading: isLoadingFiles } = useGetCaseFileStats({
    caseId: caseData.id,
  });
  const { observables, isLoading: isLoadingObservables } = useCaseObservables(caseData);

  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  // Count attack discoveries
  const attackDiscoveriesCount = useMemo(() => {
    return caseData.comments.filter(
      (comment) =>
        comment.type === AttachmentType.externalReference &&
        (comment as any).externalReferenceAttachmentTypeId === ATTACK_DISCOVERY_ATTACHMENT_TYPE
    ).length;
  }, [caseData.comments]);

  const totalAttachments = useMemo(() => {
    const alertsCount = features.alerts.enabled ? (caseData.totalAlerts ?? 0) : 0;
    const eventsCount = features.events.enabled ? (caseData.totalEvents ?? 0) : 0;
    const filesCount = fileStatsData?.total ?? 0;
    const observablesCount = canShowObservableTabs && isObservablesFeatureEnabled ? observables.length : 0;
    const attackDiscoveriesCountValue = attackDiscoveriesCount ?? 0;

    const total = alertsCount + eventsCount + filesCount + observablesCount + attackDiscoveriesCountValue;
    return isNaN(total) ? 0 : total;
  }, [
    features.alerts.enabled,
    features.events.enabled,
    caseData.totalAlerts,
    caseData.totalEvents,
    fileStatsData?.total,
    canShowObservableTabs,
    isObservablesFeatureEnabled,
    observables.length,
    attackDiscoveriesCount,
  ]);

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
                totalAlerts={caseData.totalAlerts}
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
                totalEvents={caseData.totalEvents}
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
      {
        id: CASE_VIEW_PAGE_TABS.ATTACK_DISCOVERIES,
        name: ATTACK_DISCOVERIES_TAB,
        badge: (
          <EuiNotificationBadge
            css={css`
              margin-left: ${euiTheme.size.xs};
            `}
            data-test-subj="case-view-attack-discoveries-stats-badge"
            color={activeTab === CASE_VIEW_PAGE_TABS.ATTACK_DISCOVERIES ? 'accent' : 'subdued'}
          >
            {attackDiscoveriesCount > 0 ? attackDiscoveriesCount : 0}
          </EuiNotificationBadge>
        ),
      },
    ],
    [
      activeTab,
      attackDiscoveriesCount,
      canShowObservableTabs,
      caseData.totalAlerts,
      caseData.totalEvents,
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
