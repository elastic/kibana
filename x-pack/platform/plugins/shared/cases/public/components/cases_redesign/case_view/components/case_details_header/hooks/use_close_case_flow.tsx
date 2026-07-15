/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
import { useRefreshCaseViewPage } from '../../../../../case_view/use_on_refresh_case_view_page';
import { useStatusAction } from '../../../../../actions/status/use_status_action';
import { useCloseCaseModal } from '../../../../../all_cases/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../../../../../all_cases/use_can_sync_close_reason_to_alerts';
import type { OnUpdateFields } from '../../../../../case_view/types';

interface UseCloseCaseFlowArgs {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const useCloseCaseFlow = ({ caseData, onUpdateField }: UseCloseCaseFlowArgs) => {
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: () => {},
    onActionSuccess: refreshCaseViewPage,
    selectedStatus: caseData.status,
  });

  const canSyncCloseReasonToAlerts = useCanSyncCloseReasonToAlerts({
    totalAlerts: caseData.totalAlerts,
    syncAlertsEnabled: caseData.settings.syncAlerts,
  });

  const onCloseCase = useCallback(
    (closeReason?: string) => {
      statusAction.handleUpdateCaseStatus([caseData], CaseStatuses.closed, closeReason);
    },
    [caseData, statusAction]
  );

  const { openCloseCaseModal, closeCaseModal } = useCloseCaseModal({
    canSyncCloseReasonToAlerts,
    onCloseCase,
  });

  const onStatusChanged = useCallback(
    (status: CaseStatuses) => {
      if (status !== CaseStatuses.closed) {
        onUpdateField({ key: 'status', value: status });
      } else {
        openCloseCaseModal();
      }
    },
    [onUpdateField, openCloseCaseModal]
  );

  return {
    onStatusChanged,
    closeCaseModal,
  };
};
