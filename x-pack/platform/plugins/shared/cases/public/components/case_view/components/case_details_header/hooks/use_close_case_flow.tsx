/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { CaseStatusDefinition } from '../../../../../../common/types/domain';
import { CaseStatuses } from '../../../../../../common/types/domain';
import { CATEGORY_TO_STATUS } from '../../../../../../common/utils/statuses';
import type { CaseUI } from '../../../../../../common';
import { useRefreshCaseViewPage } from '../../../use_on_refresh_case_view_page';
import { useStatusAction } from '../../../../actions/status/use_status_action';
import { getCaseStatusKey, useCaseStatuses } from '../../../../status/use_case_statuses';
import { useCloseCaseModal } from '../../../../all_cases/hooks/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../../../../all_cases/hooks/use_can_sync_close_reason_to_alerts';
import type { OnUpdateFields } from '../../../types';

interface UseCloseCaseFlowArgs {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const useCloseCaseFlow = ({ caseData, onUpdateField }: UseCloseCaseFlowArgs) => {
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { isCustomStatusesEnabled } = useCaseStatuses();
  // The done status picked from a menu; the close reason modal applies it.
  const [closingStatus, setClosingStatus] = useState<CaseStatusDefinition | null>(null);

  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: () => {},
    onActionSuccess: refreshCaseViewPage,
    selectedStatus: caseData.status,
    selectedStatusKey: getCaseStatusKey(caseData),
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
    (status: CaseStatusDefinition) => {
      // A close reason applies when the case closes, not when it moves between done statuses.
      if (status.category === 'done' && caseData.status !== CaseStatuses.closed) {
        setClosingStatus(status);
        openCloseCaseModal();
      } else if (isCustomStatusesEnabled) {
        // The single field patch only sends `status`; moving to a status also needs its key.
        statusAction.handleUpdateCaseStatus([caseData], status);
      } else {
        onUpdateField({ key: 'status', value: CATEGORY_TO_STATUS[status.category] });
      }
    },
    [caseData, isCustomStatusesEnabled, onUpdateField, openCloseCaseModal, statusAction]
  );

  return {
    onStatusChanged,
    closeCaseModal,
    isUpdatingStatus: statusAction.isUpdatingStatus,
  };
};
