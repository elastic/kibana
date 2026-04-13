/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { ToastInputFields } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { UpdateSummary } from '../../../../common/types/api';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CasesUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseStatuses } from '../../../../common/types/domain';
import { OWNER_INFO } from '../../../../common/constants';
import { isValidOwner } from '../../../../common/utils/owner';

import * as i18n from './translations';
import { StatusToastContent } from './status_toast_content';
import type { UseActionProps } from '../types';
import { statuses } from '../../status';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';
import { useKibana } from '../../../common/lib/kibana';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { generateCaseViewPath } from '../../../common/navigation';

interface GetUpdateSuccessToastParams {
  status: CaseStatuses;
  cases: CasesUI;
  updateSummary?: UpdateSummary[];
  // Dependencies for rendering re-direct button within toast
  appId?: string;
  application: ReturnType<typeof useKibana>['services']['application'];
  i18nStart: ReturnType<typeof useKibana>['services']['i18n'];
  theme: ReturnType<typeof useKibana>['services']['theme'];
  userProfile: ReturnType<typeof useKibana>['services']['userProfile'];
}

const getUpdateSuccessToast = ({
  status,
  cases,
  updateSummary,
  appId,
  application,
  i18nStart,
  theme,
  userProfile,
}: GetUpdateSuccessToastParams): { title: string; text?: ToastInputFields['text'] } => {
  const totalCases = cases.length;
  const caseTitle = totalCases === 1 ? cases[0].title : '';

  if (status === CaseStatuses.open) {
    return { title: i18n.REOPENED_CASES({ totalCases, caseTitle }) };
  }

  if (status === CaseStatuses['in-progress']) {
    return { title: i18n.MARK_IN_PROGRESS_CASES({ totalCases, caseTitle }) };
  }

  // Special handling for closed cases as it can possibly be closed with a close reason to sync to attached alerts
  const alertStatusSyncCount =
    updateSummary?.reduce((total, stats) => {
      return total + (stats?.syncedAlertCount ?? 0);
    }, 0) ?? 0;
  const totalAlertsCount = cases.reduce(
    (total, currentCase) =>
      currentCase.settings.syncAlerts ? total + currentCase.totalAlerts : total,
    0
  );
  const summary =
    totalAlertsCount === 0
      ? undefined
      : i18n.CLOSED_CASES_SUMMARY(alertStatusSyncCount, totalAlertsCount);
  const toast: { title: string; text?: ToastInputFields['text'] } = {
    title: i18n.CLOSED_CASES({ totalCases, caseTitle }),
    text: summary,
  };

  if (cases.length !== 1 || summary == null) {
    return toast;
  }

  const theCase = cases[0];
  const appIdToNavigateTo = isValidOwner(theCase.owner) ? OWNER_INFO[theCase.owner].appId : appId;
  const alertsUrl =
    appIdToNavigateTo != null
      ? application.getUrlForApp(appIdToNavigateTo, {
          deepLinkId: 'cases',
          path: generateCaseViewPath({
            detailName: theCase.id,
            tabId: CASE_VIEW_PAGE_TABS.ALERTS,
          }),
        })
      : null;

  if (alertsUrl == null) {
    return toast;
  }

  return {
    ...toast,
    text: toMountPoint(
      <StatusToastContent
        summary={summary}
        onSeeAlertsClick={() => application.navigateToUrl(alertsUrl)}
      />,
      { i18n: i18nStart, theme, userProfile }
    ),
  };
};

interface UseStatusActionProps extends UseActionProps {
  selectedStatus?: CaseStatuses;
}

export const useStatusAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  selectedStatus,
}: UseStatusActionProps) => {
  const { mutate: updateCases, isLoading: isUpdatingStatus } = useUpdateCases();
  const { canUpdate, canReopenCase } = useUserPermissions();
  const { appId } = useApplication();
  const { application, i18n: i18nStart, theme, userProfile } = useKibana().services;
  const handleUpdateCaseStatus = useCallback(
    (selectedCases: CasesUI, status: CaseStatuses, closeReason?: string) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
        closeReason,
      }));

      updateCases(
        {
          cases: casesToUpdate,
          getUpdateSuccessToast: ({ updateSummary }: { updateSummary?: UpdateSummary[] }) => {
            return getUpdateSuccessToast({
              status,
              cases: selectedCases,
              updateSummary,
              appId,
              application,
              i18nStart,
              theme,
              userProfile,
            });
          },
          originalCases: selectedCases,
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, updateCases, onActionSuccess, appId, application, i18nStart, theme, userProfile]
  );

  const shouldDisableStatus = useShouldDisableStatus();

  const getStatusIcon = (status: CaseStatuses): string =>
    selectedStatus && selectedStatus === status ? 'check' : 'empty';

  const getActions = (selectedCases: CasesUI): EuiContextMenuPanelItemDescriptor[] => {
    return [
      {
        name: statuses[CaseStatuses.open].label,
        icon: getStatusIcon(CaseStatuses.open),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.open),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-open',
        key: 'cases-bulk-action-status-open',
      },
      {
        name: statuses[CaseStatuses['in-progress']].label,
        icon: getStatusIcon(CaseStatuses['in-progress']),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses['in-progress']),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-in-progress',
        key: 'cases-bulk-action-status-in-progress',
      },
      {
        name: statuses[CaseStatuses.closed].label,
        icon: getStatusIcon(CaseStatuses.closed),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-closed',
        key: 'cases-bulk-action-status-closed',
      },
    ];
  };

  return {
    getActions,
    canUpdateStatus: canUpdate || canReopenCase,
    handleUpdateCaseStatus,
    isUpdatingStatus,
  };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
