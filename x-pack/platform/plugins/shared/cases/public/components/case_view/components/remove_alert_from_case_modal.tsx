/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { useRemoveAlertFromCase } from '../../../containers/use_remove_alert_from_case';

export interface RemoveAlertModalProps {
  caseId: string;
  alertId: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const RemoveAlertFromCaseModal: React.FC<RemoveAlertModalProps> = ({
  caseId,
  alertId,
  onClose,
  onSuccess,
}) => {
  const { mutateAsync: removeAlertFromComment } = useRemoveAlertFromCase(caseId);

  const handleRemoveAlert = useCallback(async () => {
    Promise.allSettled(
      alertId.map((id) => {
        const removalSuccessToast = i18n.translate(
          'xpack.cases.caseView.alerts.actions.removeFromCaseSuccess',
          { defaultMessage: 'Alert {alertId} removed from case', values: { alertId: id } }
        );
        return removeAlertFromComment({
          alertId: id,
          successToasterTitle: removalSuccessToast,
        });
      })
    ).then(() => {
      onSuccess();
    });

    onClose();
  }, [alertId, onClose, onSuccess, removeAlertFromComment]);

  return (
    <DeleteAttachmentConfirmationModal
      onCancel={onClose}
      onConfirm={handleRemoveAlert}
      confirmButtonText={i18n.translate(
        'xpack.cases.caseView.alerts.actions.removeFromCaseConfirm',
        {
          defaultMessage: 'Remove',
        }
      )}
      title={i18n.translate('xpack.cases.caseView.alerts.actions.removeFromCaseTitle', {
        defaultMessage: 'Remove alert from case',
      })}
    />
  );
};

RemoveAlertFromCaseModal.displayName = 'RemoveAlertFromCaseModal';
// eslint-disable-next-line import/no-default-export
export { RemoveAlertFromCaseModal as default };
