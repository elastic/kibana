/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { useChangeHistoryRestore } from '../../hooks/use_change_history_restore';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { buildChangeHistoryRestoreTelemetryParams } from '../../utils/build_change_history_restore_telemetry';
import { resolveChangeHistoryPendingChange } from '../../utils/resolve_change_history_pending_change';
import { getRestoreVersionLabel } from '../../utils/get_restore_version_label';
import * as i18n from './restore_translations';

export interface ChangeHistoryRestoreConfirmModalProps {
  change: ChangeHistoryListItem;
  currentChange?: ChangeHistoryListItem;
  onClose: () => void;
  onRestored?: () => Promise<void> | void;
}

export function ChangeHistoryRestoreConfirmModal({
  change,
  currentChange,
  onClose,
  onRestored,
}: ChangeHistoryRestoreConfirmModalProps): JSX.Element | null {
  const { adapter, objectId, supports, telemetry } = useChangeHistoryConfig();
  const [pendingChange] = useState(() =>
    resolveChangeHistoryPendingChange(adapter, supports.unsavedChanges)
  );
  const { restoreChange, isRestoring, error, clearError } = useChangeHistoryRestore({ onRestored });

  const restoreTelemetry = useMemo(
    () => ({
      ...buildChangeHistoryRestoreTelemetryParams(change, currentChange),
      ...(pendingChange ? { hadUnsavedLocalEdits: true } : {}),
    }),
    [change, currentChange, pendingChange]
  );
  const versionLabel = getRestoreVersionLabel(change);

  const handleClose = useCallback(() => {
    if (isRestoring) {
      return;
    }

    onClose();
    clearError();
  }, [clearError, isRestoring, onClose]);

  const handleConfirmRestore = useCallback(async () => {
    const confirmedAtMs = Date.now();

    telemetry.reportRestoreConfirmed(restoreTelemetry);

    const succeeded = await restoreChange({
      objectId,
      changeId: change.id,
      restoreTelemetry,
      confirmedAtMs,
    });

    if (succeeded) {
      onClose();
      clearError();
    }
  }, [change.id, clearError, objectId, onClose, restoreChange, restoreTelemetry, telemetry]);

  if (!supports.restore || change.isCurrent) {
    return null;
  }

  return (
    <EuiConfirmModal
      title={i18n.RESTORE_CONFIRM_TITLE(versionLabel)}
      onCancel={handleClose}
      onConfirm={handleConfirmRestore}
      cancelButtonText={i18n.RESTORE_CANCEL_BUTTON}
      confirmButtonText={i18n.RESTORE_CONFIRM_BUTTON}
      buttonColor="primary"
      isLoading={isRestoring}
      data-test-subj="changeHistoryRestoreConfirmModal"
    >
      <p>{i18n.RESTORE_CONFIRM_BODY(versionLabel)}</p>
      {pendingChange ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount color="warning" iconType="alert">
            <p>{i18n.RESTORE_UNSAVED_CHANGES_WARNING}</p>
          </EuiCallOut>
        </>
      ) : null}
      {error ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount color="danger" iconType="alert">
            <p>{error.message}</p>
          </EuiCallOut>
        </>
      ) : null}
    </EuiConfirmModal>
  );
}
