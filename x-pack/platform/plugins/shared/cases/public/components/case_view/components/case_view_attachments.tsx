/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useCaseViewNavigation } from '../../../common/navigation';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
import { CaseViewTabs } from '../case_view_tabs';
import { useCaseAttachmentTabs } from '../use_case_attachment_tabs';
import {
  ALERTS_TAB,
  ATTACHMENTS_TAB,
  EVENTS_TAB,
  FILES_TAB,
  OBSERVABLES_TAB,
} from '../translations';

const translateTitle = (activeTab: CASE_VIEW_PAGE_TABS) => {
  switch (activeTab) {
    case CASE_VIEW_PAGE_TABS.ALERTS: {
      return ALERTS_TAB;
    }

    case CASE_VIEW_PAGE_TABS.EVENTS: {
      return EVENTS_TAB;
    }

    case CASE_VIEW_PAGE_TABS.FILES: {
      return FILES_TAB;
    }

    case CASE_VIEW_PAGE_TABS.OBSERVABLES: {
      return OBSERVABLES_TAB;
    }

    // NOTE:this should not be called
    default:
      return ATTACHMENTS_TAB;
  }
};

export const CaseViewAttachments = ({
  caseData,
  activeTab,
  children,
}: PropsWithChildren<{
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}>) => {
  const caseViewTabs = useCaseAttachmentTabs({ caseData, activeTab });
  const { navigateToCaseView } = useCaseViewNavigation();

  const tabAsSelectableOptions = useMemo(() => {
    return caseViewTabs.map(
      (tab) =>
        ({
          label: tab.name,
          'data-test-subj': `case-view-tab-title-${tab.id}`,
          append: tab.badge,
          isFocused: tab.id === activeTab,
          onFocusBadge: false,
          onClick: () => {
            navigateToCaseView({ detailName: caseData.id, tabId: tab.id });
          },
        } as EuiSelectableOption)
    );
  }, [caseViewTabs, activeTab, navigateToCaseView, caseData.id]);

  return (
    <>
      <EuiFlexItem grow={6}>
        <CaseViewTabs caseData={caseData} activeTab={activeTab} />
        <EuiFlexGroup direction="row" responsive={false} data-test-subj="case-view-attachments">
          <EuiFlexItem grow={1} css={{ maxWidth: '18rem' }}>
            <EuiSelectable singleSelection options={tabAsSelectableOptions}>
              {(list) => list}
            </EuiSelectable>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiTitle size="s">
              <h3>{translateTitle(activeTab)}</h3>
            </EuiTitle>
            <EuiSpacer />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
