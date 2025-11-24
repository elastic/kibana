/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { ACTIVITY_TAB, ATTACHMENTS_TAB, SIMILAR_CASES_TAB } from './translations';
import { type CaseUI } from '../../../common';
import { SimilarCasesBadge, useCaseViewTabs } from './use_case_view_tabs';
import { useGetSimilarCases } from '../../containers/use_get_similar_cases';
import { useCasesFeatures } from '../../common/use_cases_features';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const caseViewTabs = useCaseViewTabs({ caseData, activeTab });

  const { euiTheme } = useEuiTheme();

  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  const { data: similarCasesData } = useGetSimilarCases({
    caseId: caseData.id,
    perPage: 0,
    page: 0,
    enabled: canShowObservableTabs && isObservablesFeatureEnabled,
  });

  const oneAttachmentsTabEnabled = true;

  const tabs = useMemo(
    () => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        name: ACTIVITY_TAB,
      },
      ...(oneAttachmentsTabEnabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.ATTACHMENTS,
              name: ATTACHMENTS_TAB,
            },
          ]
        : caseViewTabs),
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
    [activeTab, caseViewTabs, euiTheme, oneAttachmentsTabEnabled, similarCasesData?.total]
  );

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() =>
          navigateToCaseView({
            detailName: caseData.id,
            tabId: tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS ? CASE_VIEW_PAGE_TABS.ALERTS : tab.id,
          })
        }
        isSelected={
          tab.id === activeTab ||
          (oneAttachmentsTabEnabled &&
            tab.id === CASE_VIEW_PAGE_TABS.ATTACHMENTS &&
            !!caseViewTabs.find((t) => t.id === activeTab))
        }
      >
        {tab.name}
        {tab.badge ?? null}
      </EuiTab>
    ));
  }, [activeTab, caseData.id, caseViewTabs, navigateToCaseView, oneAttachmentsTabEnabled, tabs]);

  return (
    <>
      <EuiTabs data-test-subj="case-view-tabs">{renderTabs()}</EuiTabs>
      <EuiSpacer size="l" />
    </>
  );
});
CaseViewTabs.displayName = 'CaseViewTabs';
