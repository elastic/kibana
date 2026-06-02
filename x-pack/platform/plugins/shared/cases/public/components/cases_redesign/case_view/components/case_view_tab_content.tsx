/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { CASE_VIEW_PAGE_TABS } from '../../../../../common/types';
import type { CaseUI } from '../../../../../common';
import type { CasesNavigation } from '../../../links';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { CaseViewActivity } from '../../../case_view/components/case_view_activity';
import { CaseViewObservables } from '../../../case_view/components/case_view_observables';
import { CaseViewSimilarCases } from '../../../case_view/components/case_view_similar_cases';
import { CaseViewAttachments } from '../../../case_view/components/case_view_attachments';
import type { OnUpdateFields } from '../../../case_view/types';
import { useCaseViewTabs } from '../hooks/use_case_view_tabs';

interface CaseViewTabContentProps {
  caseData: CaseUI;
  searchTerm: string;
  onSearch: (term: string) => void;
  onUpdateField: (args: OnUpdateFields) => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
}

export const CaseViewTabContent: FC<CaseViewTabContentProps> = ({
  caseData,
  searchTerm,
  onSearch,
  onUpdateField,
  actionsNavigation,
}) => {
  const { features } = useCasesContext();
  const { activeTabId, isAttachmentTab, EventTabComponent, AlertTabComponent, FileTabComponent } =
    useCaseViewTabs({ caseData });

  return (
    <EuiFlexGroup data-test-subj={`case-view-tab-content-${activeTabId}`} alignItems="baseline">
      {activeTabId === CASE_VIEW_PAGE_TABS.ACTIVITY && (
        <CaseViewActivity
          caseData={caseData}
          searchTerm={searchTerm}
          actionsNavigation={actionsNavigation}
        />
      )}
      {isAttachmentTab && (
        <CaseViewAttachments
          onSearch={onSearch}
          searchTerm={searchTerm}
          activeTab={activeTabId as CASE_VIEW_PAGE_TABS}
          caseData={caseData}
        >
          <>
            {activeTabId === CASE_VIEW_PAGE_TABS.ALERTS &&
              features.alerts.enabled &&
              AlertTabComponent != null && (
                <AlertTabComponent key={caseData.updatedAt} caseData={caseData} />
              )}
            {activeTabId === CASE_VIEW_PAGE_TABS.EVENTS &&
              features.events.enabled &&
              EventTabComponent != null && <EventTabComponent caseData={caseData} />}
            {activeTabId === CASE_VIEW_PAGE_TABS.FILES && FileTabComponent != null && (
              <FileTabComponent caseData={caseData} searchTerm={searchTerm} />
            )}
            {activeTabId === CASE_VIEW_PAGE_TABS.OBSERVABLES && (
              <CaseViewObservables
                isLoading={false}
                caseData={caseData}
                searchTerm={searchTerm}
                onUpdateField={onUpdateField}
              />
            )}
          </>
        </CaseViewAttachments>
      )}
      {activeTabId === CASE_VIEW_PAGE_TABS.SIMILAR_CASES && (
        <CaseViewSimilarCases caseData={caseData} searchTerm={searchTerm} />
      )}
    </EuiFlexGroup>
  );
};

CaseViewTabContent.displayName = 'CaseViewTabContent';
