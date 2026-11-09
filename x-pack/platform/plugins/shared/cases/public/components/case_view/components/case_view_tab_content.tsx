/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
import { useCaseViewNavigation, useUrlParams } from '../../../common/navigation';
import { ATTACHMENT_TAB_ALIASES } from '../use_case_attachment_tabs';
import { CaseViewTabs } from '../case_view_tabs';
import { CaseViewActivity } from './activity/case_view_activity';
import { CaseViewSimilarCases } from './case_view_similar_cases';
import { CaseViewAttachments } from './case_view_attachments';
import { CaseViewTasks } from '../../tasks/case_view_tasks';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { filterCaseAttachmentsBySearchTerm } from './helpers';
import { CaseViewSidebar } from './sidebar/case_view_sidebar';
import { SidebarProvider, useSidebar } from './sidebar/sidebar_context';
import { SavedObjectInAppUrlsProvider } from '../../attachments/common/saved_object/saved_object_in_app_urls_context';
import type { OnUpdateFields } from '../types';
import { useCasesConfig } from '../../../common/lib/kibana';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { caseViewSectionRegistry } from '../../../client/case_view_sections';
import { useRefreshCaseViewPage } from '../use_on_refresh_case_view_page';

interface CaseViewTabContentProps {
  caseData: CaseUI;
  searchTerm: string;
  onSearch: (term: string) => void;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const CaseViewTabContent: FC<CaseViewTabContentProps> = (props) => {
  return (
    <SidebarProvider>
      <CaseViewTabContentInner {...props} />
    </SidebarProvider>
  );
};

CaseViewTabContent.displayName = 'CaseViewTabContent';

const CaseViewTabContentInner: FC<CaseViewTabContentProps> = ({
  caseData,
  searchTerm,
  onSearch,
  onUpdateField,
}) => {
  const { urlParams } = useUrlParams();
  const { tasksAuthorized } = useCasesFeatures();
  const rawTabId = urlParams?.tabId ?? CASE_VIEW_PAGE_TABS.ACTIVITY;
  const { agenticEnabled } = useCasesConfig();
  const extensionTabs = agenticEnabled ? caseViewSectionRegistry.getVisible('tab', caseData) : [];
  const activeExtensionTab = extensionTabs.find(({ tabId }) => tabId === rawTabId);

  const activeTabId: CASE_VIEW_PAGE_TABS =
    activeExtensionTab != null ||
    rawTabId === CASE_VIEW_PAGE_TABS.ACTIVITY ||
    rawTabId === CASE_VIEW_PAGE_TABS.SIMILAR_CASES ||
    (rawTabId === CASE_VIEW_PAGE_TABS.TASKS && tasksAuthorized) ||
    ATTACHMENT_TAB_ALIASES.has(rawTabId)
      ? rawTabId
      : CASE_VIEW_PAGE_TABS.ACTIVITY;

  const { isSidebarOpen } = useSidebar();
  const { permissions } = useCasesContext();
  const refreshCase = useRefreshCaseViewPage();
  const { navigateToCaseView } = useCaseViewNavigation();
  const openTab = useCallback(
    // Registered tabs bring their own ids; see `CaseViewTabSection.tabId`.
    (tabId: string) =>
      navigateToCaseView({ detailName: caseData.id, tabId: tabId as CASE_VIEW_PAGE_TABS }),
    [navigateToCaseView, caseData.id]
  );
  const aboveTabsSections = agenticEnabled
    ? caseViewSectionRegistry.getVisible('aboveTabs', caseData)
    : [];

  const caseWithFilteredAttachments = useMemo(
    () => filterCaseAttachmentsBySearchTerm(caseData, searchTerm),
    [caseData, searchTerm]
  );

  return (
    <SavedObjectInAppUrlsProvider caseData={caseWithFilteredAttachments}>
      {aboveTabsSections.map((section) => (
        <div key={section.id} data-test-subj={`case-view-above-tabs-${section.id}`}>
          {section.render({ caseData, canUpdate: permissions.update, refreshCase, openTab })}
          <EuiSpacer size="m" />
        </div>
      ))}
      <CaseViewTabs caseData={caseData} activeTab={activeTabId} />
      <EuiFlexGroup data-test-subj={`case-view-tab-content-${activeTabId}`}>
        <EuiFlexItem
          grow={true}
          // The sidebar owns a pixel width, so the content column is simply "the rest". A
          // percentage cap here would fight the dragged width. `min-width: 0` plus a break
          // anywhere keeps an unbreakable token in an activity entry (a long field value pasted
          // without spaces) from pushing the column out from under the panel beside it.
          css={css`
            min-width: 0;
            overflow-wrap: anywhere;
          `}
        >
          {activeTabId === CASE_VIEW_PAGE_TABS.ACTIVITY && (
            <CaseViewActivity caseData={caseWithFilteredAttachments} />
          )}
          {ATTACHMENT_TAB_ALIASES.has(activeTabId) && (
            <CaseViewAttachments
              caseData={caseWithFilteredAttachments}
              onSearch={onSearch}
              searchTerm={searchTerm}
              onUpdateField={onUpdateField}
            />
          )}
          {activeTabId === CASE_VIEW_PAGE_TABS.SIMILAR_CASES && (
            <CaseViewSimilarCases caseData={caseWithFilteredAttachments} />
          )}
          {activeTabId === CASE_VIEW_PAGE_TABS.TASKS && <CaseViewTasks caseId={caseData.id} />}
          {activeExtensionTab != null && (
            <div data-test-subj={`case-view-tab-section-${activeExtensionTab.id}`}>
              {activeExtensionTab.render({
                caseData,
                canUpdate: permissions.update,
                refreshCase,
                openTab,
              })}
            </div>
          )}
        </EuiFlexItem>
        {/* Hidden rather than unmounted when collapsed, so pending unconfirmed field edits
            survive a toggle the same way they already survive collapsing a single accordion. */}
        <div
          data-test-subj="case-view-sidebar-container"
          css={css`
            display: ${isSidebarOpen ? 'contents' : 'none'};
          `}
        >
          <CaseViewSidebar caseData={caseWithFilteredAttachments} />
        </div>
      </EuiFlexGroup>
    </SavedObjectInAppUrlsProvider>
  );
};

CaseViewTabContentInner.displayName = 'CaseViewTabContentInner';
