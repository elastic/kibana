/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSelectable,
  EuiSpacer,
  EuiTitle,
  EuiFieldSearch,
} from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useAttachmentsSubTabClickedEBT } from '../../../analytics/use_attachments_tab_ebt';
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
import { SEARCH_PLACEHOLDER } from '../../actions/translations';

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
  onSearch,
  searchTerm,
  children,
}: PropsWithChildren<{
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
  onSearch: (searchTerm: string) => void;
  searchTerm?: string;
}>) => {
  const { tabs: caseViewTabs } = useCaseAttachmentTabs({ caseData, activeTab, searchTerm });
  const { navigateToCaseView } = useCaseViewNavigation();
  const trackSubTabClick = useAttachmentsSubTabClickedEBT();

  const tabAsSelectableOptions = useMemo(() => {
    return caseViewTabs.map(
      (tab) =>
        ({
          label: tab.name,
          'data-test-subj': `case-view-tab-title-${tab.id}`,
          append: tab.badge,
          isFocused: tab.id === activeTab,
          onFocusBadge: false,
          showIcons: false,
          onClick: () => {
            navigateToCaseView({ detailName: caseData.id, tabId: tab.id });
            trackSubTabClick(tab.id);
          },
        } as EuiSelectableOption)
    );
  }, [caseViewTabs, activeTab, navigateToCaseView, caseData.id, trackSubTabClick]);

  return (
    <>
      <EuiFlexItem grow={6}>
        <CaseViewTabs caseData={caseData} activeTab={activeTab} searchTerm={searchTerm} />
        <EuiSpacer size="s" />
        <EuiFieldSearch
          placeholder={SEARCH_PLACEHOLDER}
          onSearch={onSearch}
          data-test-subj="cases-files-search"
          fullWidth
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" responsive={false} data-test-subj="case-view-attachments">
          <EuiFlexItem grow={1} css={{ minWidth: '18rem', maxWidth: '18rem' }}>
            <EuiSelectable singleSelection options={tabAsSelectableOptions}>
              {(list) => list}
            </EuiSelectable>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>{translateTitle(activeTab)}</h3>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
