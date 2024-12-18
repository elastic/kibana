/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

const UNTRACK_ORPHANED_ALERTS_TITLE = i18n.translate(
  'xpack.triggersActionsUI.sections.untrackAlertsModal.title',
  {
    defaultMessage: 'Disable rule',
  }
);

const UNTRACK_ORPHANED_ALERTS_CONFIRM_BUTTON_TEXT = i18n.translate(
  'xpack.triggersActionsUI.sections.untrackAlertsModal.confirmButtonText',
  {
    defaultMessage: 'Disable',
  }
);

const UNTRACK_ORPHANED_ALERTS_CANCEL_BUTTON_TEXT = i18n.translate(
  'xpack.triggersActionsUI.sections.untrackAlertsModal.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

const UNTRACK_ORPHANED_ALERTS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.untrackAlertsModal.toggleLabel',
  {
    defaultMessage: 'Change alert statuses from active to untracked',
  }
);

export interface UntrackAlertsModalProps {
  onCancel: () => void;
  onConfirm: (untrack: boolean) => void;
}

export const UntrackAlertsModal = (props: UntrackAlertsModalProps) => {
  const { onCancel, onConfirm } = props;

  const [isUntrack, setIsUntrack] = useState<boolean>(false);

  const onChange = useCallback((e: EuiSwitchEvent) => {
    setIsUntrack(e.target.checked);
  }, []);

  return (
    <EuiConfirmModal
      data-test-subj="untrackAlertsModal"
      title={UNTRACK_ORPHANED_ALERTS_TITLE}
      onCancel={onCancel}
      onConfirm={() => onConfirm(isUntrack)}
      confirmButtonText={UNTRACK_ORPHANED_ALERTS_CONFIRM_BUTTON_TEXT}
      cancelButtonText={UNTRACK_ORPHANED_ALERTS_CANCEL_BUTTON_TEXT}
    >
      <EuiSwitch
        data-test-subj="untrackAlertsModalSwitch"
        label={UNTRACK_ORPHANED_ALERTS_LABEL}
        checked={isUntrack}
        onChange={onChange}
      />
    </EuiConfirmModal>
  );
};
