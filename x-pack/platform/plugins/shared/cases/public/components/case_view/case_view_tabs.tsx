/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import {
  ACTIVITY_TAB,
  ATTACHMENTS_TAB,
  RELATED_TAB,
  SIMILAR_CASES_TAB,
  TASKS_TAB,
} from './translations';
import { useCasesConfig } from '../../common/lib/kibana';
import { caseViewSectionRegistry } from '../../client/case_view_sections';
import { CASE_LINK_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { type CaseUI } from '../../../common';
import {
  ATTACHMENT_TAB_ALIASES,
  AttachmentsBadge,
  SimilarCasesBadge,
  useCaseAttachmentsTotal,
} from './use_case_attachment_tabs';
import { useGetSimilarCases } from '../../containers/use_get_similar_cases';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useAttachmentsTabClickedEBT } from '../../analytics/use_attachments_tab_ebt';
import { useGetCaseTasks } from '../../containers/use_case_tasks';
import { isTaskFinished } from '../tasks/tasks_table';
import { COMPLETION_ARIA as TASKS_COMPLETION_ARIA } from '../tasks/translations';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

interface Tab {
  id: CASE_VIEW_PAGE_TABS;
  name: string;
  badge?: ReactNode;
}

// Registered tabs bring their own ids. The URL carries any string, so the enum type is only
// widened at this boundary.
const asTabId = (tabId: string) => tabId as CASE_VIEW_PAGE_TABS;

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const totalAttachments = useCaseAttachmentsTotal({ caseData });

  const { euiTheme } = useEuiTheme();

  const {
    observablesAuthorized: canShowObservableTabs,
    isObservablesFeatureEnabled,
    tasksAuthorized,
  } = useCasesFeatures();

  const { data: tasksData } = useGetCaseTasks(caseData.id, { enabled: tasksAuthorized });
  const totalTasks = tasksData?.tasks.length ?? 0;
  const completedTasks = tasksData?.tasks.filter(isTaskFinished).length ?? 0;

  const { agenticEnabled } = useCasesConfig();
  const { data: similarCasesData } = useGetSimilarCases({
    caseId: caseData.id,
    perPage: 0,
    page: 0,
    enabled: canShowObservableTabs && isObservablesFeatureEnabled,
  });

  const isAttachmentsTabActive = ATTACHMENT_TAB_ALIASES.has(activeTab);
  // Related counts the similar cases plus what plugins link to the case (investigations).
  const relatedSectionsCount = agenticEnabled
    ? caseViewSectionRegistry
        .getVisible('related', caseData)
        .reduce((total, section) => total + (section.getCount?.(caseData) ?? 0), 0)
    : 0;
  const linkedCasesCount = agenticEnabled
    ? caseData.comments.filter((comment) => comment.type === CASE_LINK_ATTACHMENT_TYPE).length
    : 0;
  // An approximation: a linked case that is also similar counts twice until the tab loads.
  const relatedCount =
    similarCasesData?.total != null || relatedSectionsCount + linkedCasesCount > 0
      ? (similarCasesData?.total ?? 0) + relatedSectionsCount + linkedCasesCount
      : undefined;

  const extensionTabs = useMemo(
    () => (agenticEnabled ? caseViewSectionRegistry.getVisible('tab', caseData) : []),
    [agenticEnabled, caseData]
  );

  const tabs: Tab[] = useMemo(
    () => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        name: ACTIVITY_TAB,
      },
      {
        id: CASE_VIEW_PAGE_TABS.ATTACHMENTS,
        name: ATTACHMENTS_TAB,
        badge: (
          <AttachmentsBadge
            isActive={isAttachmentsTabActive}
            euiTheme={euiTheme}
            count={totalAttachments}
          />
        ),
      },
      {
        id: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        // With agentic cases on, Similar cases becomes Related: the same similar cases, plus what
        // other plugins link to the case (investigations).
        name: agenticEnabled ? RELATED_TAB : SIMILAR_CASES_TAB,
        badge: <SimilarCasesBadge activeTab={activeTab} euiTheme={euiTheme} count={relatedCount} />,
      },
      ...(tasksAuthorized
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.TASKS,
              name: TASKS_TAB,
              badge: (
                <AttachmentsBadge
                  isActive={activeTab === CASE_VIEW_PAGE_TABS.TASKS}
                  euiTheme={euiTheme}
                  count={totalTasks === 0 ? 0 : `${completedTasks}/${totalTasks}`}
                  aria-label={TASKS_COMPLETION_ARIA(completedTasks, totalTasks)}
                  dataTestSubj="case-view-tasks-badge"
                />
              ),
            },
          ]
        : []),
      ...extensionTabs.map((section) => {
        const count = section.getBadgeCount?.(caseData);
        return {
          id: asTabId(section.tabId),
          name: section.name,
          badge: count ? (
            <AttachmentsBadge
              isActive={activeTab === section.tabId}
              euiTheme={euiTheme}
              count={count}
              dataTestSubj={`case-view-tab-badge-${section.tabId}`}
            />
          ) : undefined,
        };
      }),
    ],
    [
      extensionTabs,
      caseData,
      activeTab,
      euiTheme,
      isAttachmentsTabActive,
      completedTasks,
      totalTasks,
      relatedCount,
      agenticEnabled,
      tasksAuthorized,
      totalAttachments,
    ]
  );

  const trackAttachmentsTabClick = useAttachmentsTabClickedEBT();

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() => {
          if (tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS) {
            trackAttachmentsTabClick();
          }

          navigateToCaseView({
            detailName: caseData.id,
            tabId: tab.id,
          });
        }}
        isSelected={
          tab.id === activeTab ||
          (tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS && isAttachmentsTabActive)
        }
      >
        {tab.name}
        {tab.badge ?? null}
      </EuiTab>
    ));
  }, [
    tabs,
    activeTab,
    isAttachmentsTabActive,
    navigateToCaseView,
    caseData.id,
    trackAttachmentsTabClick,
  ]);

  return <EuiTabs data-test-subj="case-view-tabs">{renderTabs()}</EuiTabs>;
});
CaseViewTabs.displayName = 'CaseViewTabs';
