/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiFormRow, EuiTextArea, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { MAX_IMPROVEMENT_REJECT_REASON_LENGTH } from '../../../../common/constants';
import type { Improvement } from '../../../../common/http_api/improvements';

interface RejectImprovementModalProps {
  improvement: Improvement;
  onCancel: () => void;
  onConfirm: (reason: string | undefined) => void;
  isRejecting: boolean;
}

/**
 * Asks why a suggestion is being turned down, on the way to rejecting it.
 *
 * The reason is read back to later analysis runs, so this is the one chance to stop the same
 * suggestion coming back. It is optional all the same: a reviewer clearing an obviously wrong
 * suggestion should not be made to justify it, and a forced reason would mostly produce "no".
 */
export const RejectImprovementModal = ({
  improvement,
  onCancel,
  onConfirm,
  isRejecting,
}: RejectImprovementModalProps) => {
  const [reason, setReason] = useState('');
  const titleId = useGeneratedHtmlId();

  const trimmed = reason.trim();

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectModal.title', {
        defaultMessage: 'Reject “{title}”?',
        values: { title: improvement.title },
      })}
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      onCancel={onCancel}
      onConfirm={() => onConfirm(trimmed === '' ? undefined : trimmed)}
      cancelButtonText={i18n.translate(
        'xpack.contextEngine.aiIndexDetail.improvements.rejectModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.contextEngine.aiIndexDetail.improvements.rejectModal.confirmButton',
        { defaultMessage: 'Reject' }
      )}
      buttonColor="danger"
      isLoading={isRejecting}
      data-test-subj="contextImprovementRejectModal"
    >
      <EuiFormRow
        label={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.improvements.rejectModal.reasonLabel',
          { defaultMessage: 'Why are you rejecting this? (optional)' }
        )}
        helpText={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.improvements.rejectModal.reasonHelp',
          {
            defaultMessage:
              'Later analysis runs read this, so saying what is wrong keeps the same suggestion from coming back.',
          }
        )}
        fullWidth
      >
        <EuiTextArea
          autoFocus
          fullWidth
          rows={3}
          value={reason}
          maxLength={MAX_IMPROVEMENT_REJECT_REASON_LENGTH}
          onChange={(event) => setReason(event.target.value)}
          data-test-subj="contextImprovementRejectReasonInput"
          aria-label={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.improvements.rejectModal.reasonAriaLabel',
            { defaultMessage: 'Reason for rejecting this suggestion' }
          )}
        />
      </EuiFormRow>
    </EuiConfirmModal>
  );
};
