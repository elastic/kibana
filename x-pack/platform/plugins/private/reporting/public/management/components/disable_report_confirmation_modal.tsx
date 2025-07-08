/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ConfirmDisableReportModalProps {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DisableReportConfirmationModalComponent: React.FC<ConfirmDisableReportModalProps> = ({
  title,
  message,
  onCancel,
  onConfirm,
}) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.translate('xpack.reporting.schedules.disable.cancel', {
        defaultMessage: 'Cancel',
      })}
      data-test-subj="confirm-disable-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      titleProps={{
        id: titleId,
      }}
      confirmButtonText={i18n.translate('xpack.reporting.schedules.disable.confirm', {
        defaultMessage: 'Disable',
      })}
      aria-labelledby={titleId}
    >
      {message}
    </EuiConfirmModal>
  );
};
DisableReportConfirmationModalComponent.displayName = 'DisableReportConfirmationModal';

export const DisableReportConfirmationModal = React.memo(DisableReportConfirmationModalComponent);
