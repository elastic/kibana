/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { ACTIVITY_TAB, ATTACHMENTS_TAB } from './translations';
import { type CaseUI } from '../../../common';
import { useCaseViewTabs } from './use_case_view_tabs';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const caseViewTabs = useCaseViewTabs({ caseData, activeTab });

  const tabs = useMemo(
    () => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        name: ACTIVITY_TAB,
      },
      ...(true
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.ATTACHMENTS,
              name: ATTACHMENTS_TAB,
            },
          ]
        : caseViewTabs),
    ],
    [caseViewTabs]
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
        {tab.badge ?? null}
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
