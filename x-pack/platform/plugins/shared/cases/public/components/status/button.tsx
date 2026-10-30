/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';

import type { CaseStatusDefinition } from '../../../common/types/domain';
import { CaseStatuses, caseStatuses } from '../../../common/types/domain';
import { STATUS_TO_CATEGORY } from '../../../common/utils/statuses';
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
  onStatusChanged: (status: CaseStatusDefinition, closeReason?: string) => void;
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
  const { isCustomStatusesEnabled, getFirstStatusOfCategory } = useCaseStatuses();
  const canSyncCloseReasonToAlerts = useCanSyncCloseReasonToAlerts({
    totalAlerts,
    syncAlertsEnabled,
  });

  const indexOfCurrentStatus = useMemo(
    () => caseStatuses.findIndex((caseStatus) => caseStatus === status),
    [status]
  );
  const nextStatusIndex = useMemo(() => getNextItem(indexOfCurrentStatus), [indexOfCurrentStatus]);
  const nextStatus = caseStatuses[nextStatusIndex];
  // The button moves the case to the next lifecycle stage, landing on its first status.
  const target = getFirstStatusOfCategory(STATUS_TO_CATEGORY[nextStatus]);

  const onCloseCase = useCallback(
    (closeReason?: string) => {
      onStatusChanged(target, closeReason);
    },
    [onStatusChanged, target]
  );
  const { openCloseCaseModal, closeCaseModal } = useCloseCaseModal({
    canSyncCloseReasonToAlerts,
    onCloseCase,
  });

  const onClick = useCallback(() => {
    if (nextStatus === CaseStatuses.closed) {
      openCloseCaseModal();
    } else {
      onStatusChanged(target);
    }
  }, [nextStatus, onStatusChanged, openCloseCaseModal, target]);

  return (
    <>
      <EuiButton
        data-test-subj="case-view-status-action-button"
        iconType={statuses[nextStatus].icon}
        isLoading={isLoading}
        onClick={onClick}
      >
        {isCustomStatusesEnabled ? i18n.MARK_AS(target.label) : statuses[nextStatus].button.label}
      </EuiButton>
      {closeCaseModal}
    </>
  );
};
StatusActionButtonComponent.displayName = 'StatusActionButton';
export const StatusActionButton = memo(StatusActionButtonComponent);
