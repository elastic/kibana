/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { CaseStatuses, caseStatuses } from '../../../common/types/domain';
import { StatusPopoverButton } from '../status';
import { CHANGE_STATUS } from '../all_cases/translations';
import { useCloseCaseModal } from '../all_cases/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../all_cases/use_can_sync_close_reason_to_alerts';
import { useShouldDisableStatus } from '../actions/status/use_should_disable_status';

interface Props {
  currentStatus: CaseStatuses;
  totalAlerts: number;
  syncAlertsEnabled: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  onStatusChanged: (status: CaseStatuses, closeReason?: string) => void;
}

const StatusContextMenuComponent: React.FC<Props> = ({
  currentStatus,
  totalAlerts,
  syncAlertsEnabled,
  disabled = false,
  isLoading = false,
  onStatusChanged,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const shouldDisableStatus = useShouldDisableStatus();
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
  const togglePopover = useCallback(
    () => setIsPopoverOpen((prevPopoverStatus) => !prevPopoverStatus),
    []
  );

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const popOverButton = useMemo(
    () => (
      <StatusPopoverButton
        disabled={disabled || isLoading}
        status={currentStatus}
        onClick={togglePopover}
      />
    ),
    [disabled, currentStatus, togglePopover, isLoading]
  );

  const onContextMenuItemClick = useCallback(
    (status: CaseStatuses) => {
      closePopover();
      if (currentStatus !== status) {
        if (status === CaseStatuses.closed) {
          openCloseCaseModal();
        } else {
          onStatusChanged(status);
        }
      }
    },
    [closePopover, currentStatus, onStatusChanged, openCloseCaseModal]
  );

  const panelItems = useMemo(
    () =>
      caseStatuses
        .filter((_: CaseStatuses) => !shouldDisableStatus([{ status: currentStatus }]))
        .map((status: CaseStatuses) => (
          <EuiContextMenuItem
            data-test-subj={`case-view-status-dropdown-${status}`}
            icon={status === currentStatus ? 'check' : 'empty'}
            key={status}
            onClick={() => onContextMenuItemClick(status)}
          >
            <Status status={status} />
          </EuiContextMenuItem>
        )),
    [currentStatus, onContextMenuItemClick, shouldDisableStatus]
  );

  if (disabled) {
    return <Status status={currentStatus} />;
  }

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={popOverButton}
        closePopover={closePopover}
        data-test-subj="case-view-status-dropdown"
        id="caseStatusPopover"
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel title={CHANGE_STATUS} items={panelItems} />
      </EuiPopover>
      {closeCaseModal}
    </>
  );
};

StatusContextMenuComponent.displayName = 'StatusContextMenu';

export const StatusContextMenu = memo(StatusContextMenuComponent);
