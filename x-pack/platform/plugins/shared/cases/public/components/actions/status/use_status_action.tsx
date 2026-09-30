/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ToastInputFields } from '@kbn/core/public';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { UpdateSummary } from '../../../../common/types/api';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CasesUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseStatusConfiguration } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { OWNER_INFO } from '../../../../common/constants';
import { isValidOwner } from '../../../../common/utils/owner';
import { useStatusChangedEBT } from '../../../analytics/statuses';
import type { StatusChangeEntryPoint } from '../../../analytics/statuses';

import * as i18n from './translations';
import type { UseActionProps } from '../types';
import { useCaseStatuses } from '../../status/use_case_statuses';
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
}

const getUpdateSuccessToast = ({
  status,
  cases,
  updateSummary,
  appId,
  application,
}: GetUpdateSuccessToastParams): {
  title: string;
  text?: string;
  'data-test-subj'?: string;
  actionProps?: ToastInputFields['actionProps'];
} => {
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
  const toast: { title: string; text?: string; actionProps?: ToastInputFields['actionProps'] } = {
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
    text: summary,
    'data-test-subj': 'cases-status-toast',
    actionProps: {
      primary: {
        onClick: () => application.navigateToUrl(alertsUrl),
        'data-test-subj': 'cases-status-close-sync-see-alerts',
        children: i18n.SEE_ALERTS,
      },
    },
  };
};

interface UseStatusActionProps extends UseActionProps {
  entryPoint: StatusChangeEntryPoint;
  /** Category of the single selected case, when there is one */
  selectedStatus?: CaseStatuses;
  /** Configured status key of the single selected case, when there is one */
  selectedStatusKey?: string | null;
}

export const useStatusAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  entryPoint,
  selectedStatus,
  selectedStatusKey,
}: UseStatusActionProps) => {
  const { mutate: updateCases, isLoading: isUpdatingStatus } = useUpdateCases();
  const { canUpdate, canReopenCase } = useUserPermissions();
  const { appId } = useApplication();
  const { application } = useKibana().services;
  const { enabledStatuses, getStatus, isCustomStatusesEnabled } = useCaseStatuses();
  const reportStatusChanged = useStatusChangedEBT();

  const handleUpdateCaseStatus = useCallback(
    (
      selectedCases: CasesUI,
      status: CaseStatuses | CaseStatusConfiguration,
      closeReason?: string
    ) => {
      onAction();
      // A bare category lands on its default status.
      const target = typeof status === 'string' ? getStatus(undefined, status) : status;
      const casesToUpdate = selectedCases.map((theCase) => ({
        status: target.category,
        ...(isCustomStatusesEnabled && { status_key: target.key }),
        id: theCase.id,
        version: theCase.version,
        closeReason,
      }));

      updateCases(
        {
          cases: casesToUpdate,
          getUpdateSuccessToast: ({ updateSummary }: { updateSummary?: UpdateSummary[] }) => {
            return getUpdateSuccessToast({
              status: target.category,
              cases: selectedCases,
              updateSummary,
              appId,
              application,
            });
          },
          originalCases: selectedCases,
        },
        {
          onSuccess: () => {
            reportStatusChanged({
              category: target.category,
              isCustom: target.key !== target.category,
              entryPoint,
            });
            onActionSuccess();
          },
        }
      );
    },
    [
      onAction,
      getStatus,
      isCustomStatusesEnabled,
      updateCases,
      appId,
      application,
      reportStatusChanged,
      entryPoint,
      onActionSuccess,
    ]
  );

  const shouldDisableStatus = useShouldDisableStatus();

  const isSelected = (status: CaseStatusConfiguration): boolean =>
    selectedStatusKey != null
      ? status.key === selectedStatusKey
      : selectedStatus === status.category && status.isDefault;

  /**
   * @param onSelectClosed intercepts closed-category picks, for callers that collect a close reason first
   */
  const getActions = (
    selectedCases: CasesUI,
    onSelectClosed?: (status: CaseStatusConfiguration) => void
  ): EuiContextMenuPanelItemDescriptor[] =>
    enabledStatuses.map((status) => ({
      name: status.label,
      icon: isSelected(status) ? 'check' : 'empty',
      onClick: () =>
        status.category === CaseStatuses.closed && onSelectClosed
          ? onSelectClosed(status)
          : handleUpdateCaseStatus(selectedCases, status),
      disabled: isDisabled || shouldDisableStatus(selectedCases),
      'data-test-subj': `cases-bulk-action-status-${status.key}`,
      key: `cases-bulk-action-status-${status.key}`,
    }));

  return {
    getActions,
    canUpdateStatus: canUpdate || canReopenCase,
    handleUpdateCaseStatus,
    isUpdatingStatus,
  };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
