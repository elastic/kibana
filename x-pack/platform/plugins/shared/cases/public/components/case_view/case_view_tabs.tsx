/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { ACTIVITY_TAB, ATTACHMENTS_TAB, SIMILAR_CASES_TAB } from './translations';
import { type CaseUI } from '../../../common';
import type { CaseViewTab } from './use_case_attachment_tabs';
import {
  AttachmentsBadge,
  SimilarCasesBadge,
  useCaseAttachmentTabs,
} from './use_case_attachment_tabs';
import { useGetSimilarCases } from '../../containers/use_get_similar_cases';
import { useCasesFeatures } from '../../common/use_cases_features';
import {
  useAttachmentsSubTabClickedEBT,
  useAttachmentsTabClickedEBT,
} from '../../analytics/use_attachments_tab_ebt';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
  searchTerm?: string;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab, searchTerm }) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { tabs: attachmentTabs, totalAttachments } = useCaseAttachmentTabs({
    caseData,
    activeTab,
    searchTerm,
  });

  const { euiTheme } = useEuiTheme();

  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  const { data: similarCasesData } = useGetSimilarCases({
    caseId: caseData.id,
    perPage: 0,
    page: 0,
    enabled: canShowObservableTabs && isObservablesFeatureEnabled,
  });

  const isAttachmentsTabActive = useMemo(
    () => !!attachmentTabs.find((attachmentTab) => attachmentTab.id === activeTab),
    [activeTab, attachmentTabs]
  );

  const defaultAttachmentsTabId = attachmentTabs[0].id;

  const tabs: CaseViewTab[] = useMemo(
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
  const trackAttachmentsSubTabClick = useAttachmentsSubTabClickedEBT();

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() => {
          if (tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS) {
            trackAttachmentsTabClick();
            // NOTE: counting default sub-tab click here as it is already picked when navigating to attachments tab
            trackAttachmentsSubTabClick(defaultAttachmentsTabId);
          }

          navigateToCaseView({
            detailName: caseData.id,
            tabId: tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS ? CASE_VIEW_PAGE_TABS.ALERTS : tab.id,
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
    trackAttachmentsSubTabClick,
    defaultAttachmentsTabId,
  ]);

  return <EuiTabs data-test-subj="case-view-tabs">{renderTabs()}</EuiTabs>;
});
CaseViewTabs.displayName = 'CaseViewTabs';
