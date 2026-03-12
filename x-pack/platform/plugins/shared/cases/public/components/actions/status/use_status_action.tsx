/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { CaseUpdateRequest } from '../../../../common/ui';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CasesUI } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';

import * as i18n from './translations';
import type { UseActionProps } from '../types';
import { statuses } from '../../status';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';

const getStatusToasterMessage = (status: CaseStatuses, cases: CasesUI): string => {
  const totalCases = cases.length;
  const caseTitle = totalCases === 1 ? cases[0].title : '';

  if (status === CaseStatuses.open) {
    return i18n.REOPENED_CASES({ totalCases, caseTitle });
  } else if (status === CaseStatuses['in-progress']) {
    return i18n.MARK_IN_PROGRESS_CASES({ totalCases, caseTitle });
  } else if (status === CaseStatuses.closed) {
    return i18n.CLOSED_CASES({ totalCases, caseTitle });
  }

  return '';
};

const getCloseStatusToast = ({
  cases,
  closedAlertsCount,
}: {
  cases: CasesUI;
  closedAlertsCount: number;
}) => ({
  title: i18n.CLOSED_CASES({
    totalCases: cases.length,
    caseTitle: cases.length === 1 ? cases[0].title : '',
  }),
  text: i18n.CLOSED_ALERTS_SYNC_SUMMARY(closedAlertsCount),
});

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
  const handleUpdateCaseStatus = useCallback(
    (selectedCases: CasesUI, status: CaseStatuses, closeReason?: string) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
        closeReason,
      })) as CaseUpdateRequest[];

      updateCases(
        {
          cases: casesToUpdate,
          successToasterTitle:
            closeReason != null && status === CaseStatuses.closed
              ? undefined
              : getStatusToasterMessage(status, selectedCases),
          includeAlertsStatusUpdateSummary: closeReason != null && status === CaseStatuses.closed,
          getSuccessToast:
            closeReason != null && status === CaseStatuses.closed
              ? ({ alertsStatusUpdateSummary }) =>
                  getCloseStatusToast({
                    cases: selectedCases,
                    closedAlertsCount: alertsStatusUpdateSummary?.closed ?? 0,
                  })
              : undefined,
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, updateCases, onActionSuccess]
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
