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
import { ACTIVITY_TAB, ATTACHMENTS_TAB, SIMILAR_CASES_TAB } from './translations';
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

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

interface Tab {
  id: CASE_VIEW_PAGE_TABS;
  name: string;
  badge?: ReactNode;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const totalAttachments = useCaseAttachmentsTotal({ caseData });

  const { euiTheme } = useEuiTheme();

  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  const { data: similarCasesData } = useGetSimilarCases({
    caseId: caseData.id,
    perPage: 0,
    page: 0,
    enabled: canShowObservableTabs && isObservablesFeatureEnabled,
  });

  const isAttachmentsTabActive = ATTACHMENT_TAB_ALIASES.has(activeTab);

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
        name: SIMILAR_CASES_TAB,
        badge: (
          <SimilarCasesBadge
            activeTab={activeTab}
            euiTheme={euiTheme}
            count={similarCasesData?.total}
          />
        ),
      },
    ],
    [activeTab, euiTheme, isAttachmentsTabActive, similarCasesData?.total, totalAttachments]
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
