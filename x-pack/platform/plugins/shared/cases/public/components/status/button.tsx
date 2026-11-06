/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';

import type { CaseStatusConfiguration } from '../../../common/types/domain';
import { CaseStatuses, caseStatuses } from '../../../common/types/domain';
import { useCloseCaseModal } from '../all_cases/hooks/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../all_cases/hooks/use_can_sync_close_reason_to_alerts';
import { statuses } from './config';
import { useCaseStatuses } from './use_case_statuses';
import * as i18n from './translations';

interface Props {
  status: CaseStatuses;
  totalAlerts: number;
  syncAlertsEnabled: boolean;
  isLoading: boolean;
  onStatusChanged: (status: CaseStatuses, closeReason?: string) => void;
  /** When the case is paused: the status Resume returns it to, replacing the category step */
  resumeStatus?: CaseStatusConfiguration | null;
  onResume?: () => void;
}

// Rotate over the statuses. open -> in-progress -> closes -> open...
const getNextItem = (item: number) => (item + 1) % caseStatuses.length;

const StatusActionButtonComponent: React.FC<Props> = ({
  status,
  totalAlerts,
  syncAlertsEnabled,
  onStatusChanged,
  isLoading,
  resumeStatus,
  onResume,
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
  // The button is a category transition; the server lands the case on that category's default.
  const { getStatus } = useCaseStatuses();
  const nextLabel = getStatus(undefined, nextStatus).label;

  const onClick = useCallback(() => {
    if (nextStatus === CaseStatuses.closed) {
      openCloseCaseModal();
    } else {
      onStatusChanged(nextStatus);
    }
  }, [nextStatus, onStatusChanged, openCloseCaseModal]);

  if (resumeStatus && onResume) {
    return (
      <EuiButton
        data-test-subj="case-view-status-action-button"
        iconType="play"
        isLoading={isLoading}
        onClick={onResume}
        aria-label={i18n.RESUME_TO(resumeStatus.label)}
      >
        {i18n.RESUME}
      </EuiButton>
    );
  }

  return (
    <>
      <EuiButton
        data-test-subj="case-view-status-action-button"
        iconType={statuses[caseStatuses[nextStatusIndex]].icon}
        isLoading={isLoading}
        onClick={onClick}
      >
        {i18n.MARK_AS(nextLabel)}
      </EuiButton>
      {closeCaseModal}
    </>
  );
};
StatusActionButtonComponent.displayName = 'StatusActionButton';
export const StatusActionButton = memo(StatusActionButtonComponent);
