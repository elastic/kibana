/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { ChangeHistoryRestoreConfirmModal } from './change_history_restore_confirm_modal';
import * as i18n from './restore_translations';

export interface ChangeHistoryRestoreButtonProps {
  change: ChangeHistoryDetail;
  /** Live/current change used for rollback-distance telemetry when sequences are present. */
  currentChange?: ChangeHistoryListItem;
  /** Invoked after a successful restore (e.g. to refetch and re-select the current change). */
  onRestored?: () => Promise<void> | void;
}

export function ChangeHistoryRestoreButton({
  change,
  currentChange,
  onRestored,
}: ChangeHistoryRestoreButtonProps): JSX.Element | null {
  const { supports } = useChangeHistoryConfig();
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  const handleOpenConfirm = useCallback(() => {
    setIsConfirmVisible(true);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    setIsConfirmVisible(false);
  }, []);

  if (!supports.restore || change.isCurrent) {
    return null;
  }

  return (
    <>
      <EuiButton
        iconType="undo"
        fill
        color="primary"
        onClick={handleOpenConfirm}
        data-test-subj="changeHistoryRestoreButton"
      >
        {i18n.RESTORE_BUTTON_LABEL}
      </EuiButton>

      {isConfirmVisible ? (
        <ChangeHistoryRestoreConfirmModal
          change={change}
          currentChange={currentChange}
          onClose={handleCloseConfirm}
          onRestored={onRestored}
        />
      ) : null}
    </>
  );
}
