/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { useRemoveAlertFromCase } from '../../../containers/use_remove_alert_from_case';

export interface RemoveAlertModalProps {
  caseId: string;
  alertId: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const RemoveAlertFromCaseModalComponent: React.FC<RemoveAlertModalProps> = ({
  caseId,
  alertId,
  onClose,
  onSuccess,
}) => {
  const removalSuccessToast = i18n.translate(
    'xpack.cases.caseView.alerts.actions.removeFromCaseSuccess',
    { defaultMessage: 'Alert removed from case' }
  );

  const { mutateAsync: removeAlertFromComment } = useRemoveAlertFromCase(caseId);

  return (
    <DeleteAttachmentConfirmationModal
      onCancel={onClose}
      onConfirm={() => {
        Promise.allSettled(
          alertId.map((id) =>
            removeAlertFromComment({
              alertId: id,
              successToasterTitle: removalSuccessToast,
            })
          )
        );
        onSuccess();
        onClose();
      }}
      confirmButtonText={i18n.translate(
        'xpack.observability.alerts.actions.removeFromCaseConfirm',
        {
          defaultMessage: 'Remove',
        }
      )}
      title={i18n.translate('xpack.observability.alerts.actions.removeFromCaseTitle', {
        defaultMessage: 'Remove alert from case',
      })}
    />
  );
};

RemoveAlertFromCaseModalComponent.displayName = 'RemoveAlertFromCaseModal';

export const RemoveAlertFromCaseModal = React.memo(RemoveAlertFromCaseModalComponent);
