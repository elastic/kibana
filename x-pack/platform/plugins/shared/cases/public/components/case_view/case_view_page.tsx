/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useUrlParams } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CaseActionBar } from '../case_action_bar';
import { HeaderPage } from '../header_page';
import { EditableTitle } from '../header_page/editable_title';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { CaseViewActivity } from './components/case_view_activity';
import { CaseViewAlerts } from './components/case_view_alerts';
import { CaseViewFiles } from './components/case_view_files';
import { CaseViewObservables } from './components/case_view_observables';
import { CaseViewMetrics } from './metrics';
import type { CaseViewPageProps } from './types';
import { useRefreshCaseViewPage } from './use_on_refresh_case_view_page';
import { useOnUpdateField } from './use_on_update_field';
import { CaseViewSimilarCases } from './components/case_view_similar_cases';

const getActiveTabId = (tabId?: string) => {
  if (tabId && Object.values(CASE_VIEW_PAGE_TABS).includes(tabId as CASE_VIEW_PAGE_TABS)) {
    return tabId;
  }

  return CASE_VIEW_PAGE_TABS.ACTIVITY;
};

export const CaseViewPage = React.memo<CaseViewPageProps>(
  ({
    caseData,
    refreshRef,
    ruleDetailsNavigation,
    actionsNavigation,
    showAlertDetails,
    useFetchAlertData,
    onAlertsTableLoaded,
    renderAlertsTable,
  }) => {
    const { features } = useCasesContext();
    const { urlParams } = useUrlParams();
    const refreshCaseViewPage = useRefreshCaseViewPage();

    useCasesTitleBreadcrumbs(caseData.title);

    const activeTabId = getActiveTabId(urlParams?.tabId);

    const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({
      caseData,
    });

    // Set `refreshRef` if needed
    useEffect(() => {
      let isStale = false;
      if (refreshRef) {
        refreshRef.current = {
          refreshCase: async () => {
            // Do nothing if component (or instance of this render cycle) is stale or it is already loading
            if (isStale || isLoading) {
              return;
            }
            refreshCaseViewPage();
          },
        };
        return () => {
          isStale = true;
          refreshRef.current = null;
        };
      }
    }, [isLoading, refreshRef, refreshCaseViewPage]);

    const onSubmitTitle = useCallback(
      (newTitle: string) =>
        onUpdateField({
          key: 'title',
          value: newTitle,
        }),
      [onUpdateField]
    );

    return (
      <>
        <HeaderPage
          border={false}
          showBackButton={true}
          data-test-subj="case-view-title"
          titleNode={
            <EditableTitle
              key={caseData.id}
              isLoading={isLoading && loadingKey === 'title'}
              title={caseData.title}
              onSubmit={onSubmitTitle}
            />
          }
          title={caseData.title}
        >
          <CaseActionBar
            caseData={caseData}
            isLoading={isLoading && (loadingKey === 'status' || loadingKey === 'settings')}
            onUpdateField={onUpdateField}
          />
        </HeaderPage>
        <EuiFlexGroup>
          <EuiFlexItem>
            <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup data-test-subj={`case-view-tab-content-${activeTabId}`} alignItems="baseline">
          {activeTabId === CASE_VIEW_PAGE_TABS.ACTIVITY && (
            <CaseViewActivity
              ruleDetailsNavigation={ruleDetailsNavigation}
              caseData={caseData}
              actionsNavigation={actionsNavigation}
              showAlertDetails={showAlertDetails}
              useFetchAlertData={useFetchAlertData}
            />
          )}
          {activeTabId === CASE_VIEW_PAGE_TABS.ALERTS && features.alerts.enabled && (
            <CaseViewAlerts
              caseData={caseData}
              renderAlertsTable={renderAlertsTable}
              onAlertsTableLoaded={onAlertsTableLoaded}
            />
          )}
          {activeTabId === CASE_VIEW_PAGE_TABS.FILES && <CaseViewFiles caseData={caseData} />}
          {activeTabId === CASE_VIEW_PAGE_TABS.OBSERVABLES && (
            <CaseViewObservables isLoading={isLoading} caseData={caseData} />
          )}
          {activeTabId === CASE_VIEW_PAGE_TABS.SIMILAR_CASES && (
            <CaseViewSimilarCases caseData={caseData} />
          )}
        </EuiFlexGroup>
      </>
    );
  }
);
CaseViewPage.displayName = 'CaseViewPage';
