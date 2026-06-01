/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';

import { CaseStatuses, caseStatuses } from '../../../common/types/domain';
import { useCloseCaseModal } from '../all_cases/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../all_cases/use_can_sync_close_reason_to_alerts';
import { statuses } from './config';

interface Props {
  status: CaseStatuses;
  totalAlerts: number;
  syncAlertsEnabled: boolean;
  isLoading: boolean;
  onStatusChanged: (status: CaseStatuses, closeReason?: string) => void;
}

// Rotate over the statuses. open -> in-progress -> closes -> open...
const getNextItem = (item: number) => (item + 1) % caseStatuses.length;

const StatusActionButtonComponent: React.FC<Props> = ({
  status,
  totalAlerts,
  syncAlertsEnabled,
  onStatusChanged,
  isLoading,
}) => {
  const canSyncCloseReasonToAlerts = useCanSyncCloseReasonToAlerts({
    totalAlerts,
    syncAlertsEnabled,
  });
  const onCloseCase = useCallback(
    (closeReason?: string) => {
      onStatusChanged(CaseStatuses.closed, closeReason);
    },
    [onStatusChanged]
  );
  const { openCloseCaseModal, closeCaseModal } = useCloseCaseModal({
    canSyncCloseReasonToAlerts,
    onCloseCase,
  });

  const indexOfCurrentStatus = useMemo(
    () => caseStatuses.findIndex((caseStatus) => caseStatus === status),
    [status]
  );
  const nextStatusIndex = useMemo(() => getNextItem(indexOfCurrentStatus), [indexOfCurrentStatus]);
  const nextStatus = caseStatuses[nextStatusIndex];

  const onClick = useCallback(() => {
    if (nextStatus === CaseStatuses.closed) {
      openCloseCaseModal();
    } else {
      onStatusChanged(nextStatus);
    }
  }, [nextStatus, onStatusChanged, openCloseCaseModal]);

  return (
    <>
      <EuiButton
        data-test-subj="case-view-status-action-button"
        iconType={statuses[caseStatuses[nextStatusIndex]].icon}
        isLoading={isLoading}
        onClick={onClick}
      >
        {statuses[caseStatuses[nextStatusIndex]].button.label}
      </EuiButton>
      {closeCaseModal}
    </>
  );
};
StatusActionButtonComponent.displayName = 'StatusActionButton';
export const StatusActionButton = memo(StatusActionButtonComponent);
