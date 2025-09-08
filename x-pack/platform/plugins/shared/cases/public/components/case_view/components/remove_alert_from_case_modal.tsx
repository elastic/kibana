/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { useRemoveAlertFromCase } from '../../../containers/use_remove_alerts_from_case';

export interface RemoveAlertModalProps {
  caseId: string;
  alertIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const RemoveAlertFromCaseModal = React.memo<RemoveAlertModalProps>(
  ({ caseId, alertIds, onClose, onSuccess }) => {
    const { mutateAsync: removeAlertFromComment } = useRemoveAlertFromCase(caseId);

    const removalSuccessToast = i18n.translate(
      'xpack.cases.caseView.alerts.actions.removeFromCaseSuccess',
      {
        defaultMessage: '{alertCount, plural, one {Alert} other {# alerts}} removed from case',
        values: {
          alertCount: alertIds.length,
        },
      }
    );
    const handleRemoveAlert = useCallback(() => {
      removeAlertFromComment({
        alertIds,
        successToasterTitle: removalSuccessToast,
      }).then(() => onSuccess());

      onClose();
    }, [alertIds, onClose, onSuccess, removeAlertFromComment, removalSuccessToast]);

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
          defaultMessage: 'Remove {alertCount, plural, one {alert} other {# alerts}} from case',
          values: {
            alertCount: alertIds.length,
          },
        })}
      />
    );
  }
);

RemoveAlertFromCaseModal.displayName = 'RemoveAlertFromCaseModal';
// eslint-disable-next-line import/no-default-export
export { RemoveAlertFromCaseModal as default };
