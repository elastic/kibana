/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { ToastInputFields } from '@kbn/core/public';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import type { UpdateSummary } from '../../../../common/types/api';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CaseUpdateRequest } from '../../../containers/types';
import type { CasesUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { CATEGORY_TO_STATUS } from '../../../../common/utils/statuses';
import { getCaseAppTarget } from '../../../common/top_level_app';

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
  /** The label of the status the cases moved to, when custom statuses are on. */
  statusLabel?: string;
  cases: CasesUI;
  updateSummary?: UpdateSummary[];
  // Dependencies for rendering re-direct button within toast
  appId?: string;
  application: ReturnType<typeof useKibana>['services']['application'];
}

const getUpdateSuccessToast = ({
  status,
  statusLabel,
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

  if (statusLabel != null && status !== CaseStatuses.closed) {
    return { title: i18n.MARKED_CASES_AS({ totalCases, caseTitle, status: statusLabel }) };
  }

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
  const { appId: appIdToNavigateTo, deepLinkId } = getCaseAppTarget(theCase.owner, appId);
  const alertsUrl =
    appIdToNavigateTo != null
      ? application.getUrlForApp(appIdToNavigateTo, {
          deepLinkId,
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

/** A status update for the bulk patch API. `status_key` is sent as is, so it stays snake case. */
type CaseStatusUpdateRequest = CaseUpdateRequest & { status_key?: string };

interface UseStatusActionProps extends UseActionProps {
  /** The status category of the single selected case, when there is one. */
  selectedStatus?: CaseStatuses;
  /** The status key of the single selected case, when there is one. */
  selectedStatusKey?: string | null;
}

export const useStatusAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  selectedStatus,
  selectedStatusKey,
}: UseStatusActionProps) => {
  const { mutate: updateCases, isLoading: isUpdatingStatus } = useUpdateCases();
  const { canUpdate, canReopenCase } = useUserPermissions();
  const { appId } = useApplication();
  const { application } = useKibana().services;
  const { isCustomStatusesEnabled, getStatus, getPickableStatuses } = useCaseStatuses();

  /**
   * Moves cases to a status. A bare category moves them to its default status; a status
   * definition moves them to that status.
   */
  const handleUpdateCaseStatus = useCallback(
    (selectedCases: CasesUI, target: CaseStatuses | CaseStatusDefinition, closeReason?: string) => {
      onAction();
      const isDefinition = typeof target !== 'string';
      const status = isDefinition ? CATEGORY_TO_STATUS[target.category] : target;
      const statusKey = isCustomStatusesEnabled && isDefinition ? target.key : undefined;
      const casesToUpdate: CaseStatusUpdateRequest[] = selectedCases.map((theCase) => ({
        status,
        ...(statusKey != null ? { status_key: statusKey } : {}),
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
              statusLabel: statusKey != null && isDefinition ? target.label : undefined,
              cases: selectedCases,
              updateSummary,
              appId,
              application,
            });
          },
          originalCases: selectedCases,
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, isCustomStatusesEnabled, updateCases, onActionSuccess, appId, application]
  );

  const shouldDisableStatus = useShouldDisableStatus();

  const currentStatus = useMemo(
    () =>
      selectedStatus != null
        ? getStatus({ status: selectedStatus, statusKey: selectedStatusKey })
        : undefined,
    [getStatus, selectedStatus, selectedStatusKey]
  );

  /**
   * The status menu items. Picks of a done status go to `onSelectClosed` when given, so callers
   * can ask for a close reason first.
   */
  const getActions = (
    selectedCases: CasesUI,
    onSelectClosed?: (status: CaseStatusDefinition) => void
  ): EuiContextMenuPanelItemDescriptor[] => {
    const isMenuDisabled = isDisabled || shouldDisableStatus(selectedCases);

    return getPickableStatuses(currentStatus).map((status) => ({
      name: status.disabled ? (
        <EuiFlexGroup gutterSize="s" responsive={false} component="span">
          <EuiFlexItem grow={false} component="span">
            {status.label}
          </EuiFlexItem>
          <EuiFlexItem grow={false} component="span">
            <EuiTextColor color="subdued">{i18n.DISABLED_STATUS}</EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        status.label
      ),
      icon: currentStatus?.key === status.key ? 'check' : 'empty',
      onClick: () =>
        status.category === 'done' && onSelectClosed != null
          ? onSelectClosed(status)
          : handleUpdateCaseStatus(selectedCases, status),
      // A disabled status only shows as the current one; cases cannot move to it.
      disabled: isMenuDisabled || status.disabled,
      'data-test-subj': `cases-bulk-action-status-${status.key}`,
      key: `cases-bulk-action-status-${status.key}`,
    }));
  };

  return {
    getActions,
    canUpdateStatus: canUpdate || canReopenCase,
    handleUpdateCaseStatus,
    isUpdatingStatus,
  };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
