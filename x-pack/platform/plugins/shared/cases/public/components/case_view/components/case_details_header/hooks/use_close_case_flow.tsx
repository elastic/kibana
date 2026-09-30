/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { CaseStatusConfiguration } from '../../../../../../common/types/domain';
import { CaseStatuses } from '../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../common';
import { useStatusChangedEBT } from '../../../../../analytics/statuses';
import type { StatusChangeEntryPoint } from '../../../../../analytics/statuses';
import { useRefreshCaseViewPage } from '../../../use_on_refresh_case_view_page';
import { useStatusAction } from '../../../../actions/status/use_status_action';
import { useCaseStatuses } from '../../../../status/use_case_statuses';
import { useCloseCaseModal } from '../../../../all_cases/hooks/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../../../../all_cases/hooks/use_can_sync_close_reason_to_alerts';
import type { OnUpdateFields } from '../../../types';

interface UseCloseCaseFlowArgs {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  entryPoint: StatusChangeEntryPoint;
}

export const useCloseCaseFlow = ({ caseData, onUpdateField, entryPoint }: UseCloseCaseFlowArgs) => {
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { isCustomStatusesEnabled } = useCaseStatuses();
  const reportStatusChanged = useStatusChangedEBT();
  // The closed-category status picked from the menu; the close-reason modal applies it.
  const [closingStatus, setClosingStatus] = useState<CaseStatusConfiguration | null>(null);

  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: () => {},
    onActionSuccess: refreshCaseViewPage,
    entryPoint,
    selectedStatus: caseData.status,
    selectedStatusKey: caseData.statusKey,
  });

  const canSyncCloseReasonToAlerts = useCanSyncCloseReasonToAlerts({
    totalAlerts: caseData.totalAlerts,
    syncAlertsEnabled: caseData.settings.syncAlerts,
  });

  const onCloseCase = useCallback(
    (closeReason?: string) => {
      statusAction.handleUpdateCaseStatus(
        [caseData],
        closingStatus ?? CaseStatuses.closed,
        closeReason
      );
    },
    [caseData, closingStatus, statusAction]
  );

  const { openCloseCaseModal, closeCaseModal } = useCloseCaseModal({
    canSyncCloseReasonToAlerts,
    onCloseCase,
  });

  const onStatusChanged = useCallback(
    (status: CaseStatusConfiguration) => {
      if (status.category === CaseStatuses.closed) {
        setClosingStatus(status);
        openCloseCaseModal();
      } else if (isCustomStatusesEnabled) {
        // The single-field patch only knows `status`; custom statuses need `status_key` too.
        statusAction.handleUpdateCaseStatus([caseData], status);
      } else {
        onUpdateField({ key: 'status', value: status.category });
        reportStatusChanged({ category: status.category, isCustom: false, entryPoint });
      }
    },
    [
      caseData,
      entryPoint,
      isCustomStatusesEnabled,
      onUpdateField,
      openCloseCaseModal,
      reportStatusChanged,
      statusAction,
    ]
  );

  return {
    onStatusChanged,
    closeCaseModal,
    isUpdatingStatus: statusAction.isUpdatingStatus,
  };
};
