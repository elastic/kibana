/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ReportDestructiveActionConfirmationModalProps {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmButtonText?: string;
}

const DEFAULT_CONFIRM_BUTTON_TEXT = i18n.translate(
  'xpack.reporting.schedules.destructiveAction.confirm',
  {
    defaultMessage: 'Confirm',
  }
);

const ReportDestructiveActionConfirmationModalComponent: React.FC<
  ReportDestructiveActionConfirmationModalProps
> = ({ title, message, onCancel, onConfirm, confirmButtonText = DEFAULT_CONFIRM_BUTTON_TEXT }) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.translate('xpack.reporting.schedules.destructiveAction.cancel', {
        defaultMessage: 'Cancel',
      })}
      data-test-subj="confirm-destructive-action-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      titleProps={{
        id: titleId,
      }}
      confirmButtonText={confirmButtonText}
      aria-labelledby={titleId}
    >
      {message}
    </EuiConfirmModal>
  );
};
ReportDestructiveActionConfirmationModalComponent.displayName = 'DisableReportConfirmationModal';

export const ReportDestructiveActionConfirmationModal = React.memo(
  ReportDestructiveActionConfirmationModalComponent
);
