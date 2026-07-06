/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { CaseUI } from '../../../../../../common';
import { StatusActionButton } from '../../../../status/button';
import { CaseViewAttachButton } from '../../../../case_view/components/case_view_attach_button';
import { UserActions } from '../../../user_actions';
import { UserActionsFilterBar } from '../user_actions_filter_bar';
import { SidebarToggleButton } from '../sidebar/sidebar_toggle_button';
import { Description } from '../../../description';
import { useCaseViewActivity } from './hooks/use_case_view_activity';

export const CaseViewActivity = ({ caseData }: { caseData: CaseUI }) => {
  const {
    permissions,
    userActivityQueryParams,
    onUpdateField,
    isLoadingUserActionsStats,
    isLoadingCaseConnectors,
    isLoadingCaseUsers,
    caseConnectors,
    caseUsers,
    userActionsStats,
    userProfiles,
    currentUserProfile,
    casesConfiguration,
    isLoadingDescription,
    isStatusLoading,
    changeStatus,
    handleUserActivityParamsChanged,
  } = useCaseViewActivity({ caseData });

  const showUserActions =
    !isLoadingUserActionsStats &&
    !isLoadingCaseConnectors &&
    !isLoadingCaseUsers &&
    caseConnectors &&
    caseUsers &&
    userActionsStats;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
          <EuiFlexItem grow={true}>
            <UserActionsFilterBar
              caseId={caseData.id}
              onParamsChange={handleUserActivityParamsChanged}
              params={userActivityQueryParams}
              userActionsStats={userActionsStats}
              isLoading={isLoadingUserActionsStats}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SidebarToggleButton />
          </EuiFlexItem>
        </EuiFlexGroup>
        <Description
          isLoadingDescription={isLoadingDescription}
          caseData={caseData}
          onUpdateField={onUpdateField}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      {(isLoadingUserActionsStats || isLoadingCaseConnectors || isLoadingCaseUsers) && (
        <EuiLoadingSpinner data-test-subj="case-view-loading-content" size="l" />
      )}
      {showUserActions ? (
        <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-activity">
          <EuiFlexItem>
            <UserActions
              userProfiles={userProfiles}
              currentUserProfile={currentUserProfile}
              caseConnectors={caseConnectors}
              data={caseData}
              casesConfiguration={casesConfiguration}
              onUpdateField={onUpdateField}
              statusActionButton={
                permissions.update ? (
                  <StatusActionButton
                    status={caseData.status}
                    totalAlerts={caseData.totalAlerts}
                    syncAlertsEnabled={caseData.settings.syncAlerts}
                    onStatusChanged={changeStatus}
                    isLoading={isStatusLoading}
                  />
                ) : null
              }
              attachActionButton={<CaseViewAttachButton caseData={caseData} />}
              userActivityQueryParams={userActivityQueryParams}
              userActionsStats={userActionsStats}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};
CaseViewActivity.displayName = 'CaseViewActivity';
